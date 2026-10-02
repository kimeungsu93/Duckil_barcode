// GET·PATCH·DELETE /api/records/[id] - 기록 상세 조회·부분 수정·삭제 (PRD §4)
import { NextResponse } from 'next/server'
import { apiError, zodErrorToFields } from '@/lib/api-error'
import {
  photoErrorResponse,
  precheckErrorResponse,
  precheckPhotos,
  readRecordForm,
  rollbackSavedPhotos,
  savePhotos,
} from '@/lib/record-form'
import { toRecordDto } from '@/lib/record-mapper'
import {
  deleteRecord,
  findRecordById,
  updateRecord,
  type UpdateRecordPatch,
} from '@/lib/records-repo'
import { recordIdSchema, updateRecordSchema } from '@/lib/schemas/record'
import { deletePhoto } from '@/lib/storage'

export const runtime = 'nodejs'

// 경로 파라미터 id를 검증한다. 실패하면 응답을, 성공하면 숫자 id를 반환한다
function parseId(id: string): { ok: true; id: number } | { ok: false } {
  const parsed = recordIdSchema.safeParse(id)
  if (!parsed.success) return { ok: false }
  return { ok: true, id: parsed.data }
}

const NOT_FOUND_MESSAGE = '기록을 찾을 수 없습니다'

// GET /api/records/[id]: 단건 조회
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idResult = parseId(id)
  if (!idResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', '잘못된 ID입니다')
  }

  try {
    const row = findRecordById(idResult.id)
    if (!row) {
      return apiError(404, 'NOT_FOUND', NOT_FOUND_MESSAGE)
    }
    return NextResponse.json(toRecordDto(row))
  } catch (error) {
    console.error('[GET /api/records/[id]] 조회 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 조회에 실패했습니다')
  }
}

// PATCH /api/records/[id]: multipart/form-data 부분 수정.
// 순서: id 검증 → 존재 확인 → 텍스트 검증 → 사진 사전 검사 → 새 파일 저장 → DB 갱신
// 사진을 보내면 새 uuid 파일명으로 먼저 저장하고, DB 갱신 성공 후에만 기존 파일을 지운다 (Q5).
// 사진 삭제(슬롯 비우기)는 지원하지 않는다 (Q11). raw_text는 스키마에 없어 항상 무시된다 (F1-5)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idResult = parseId(id)
  if (!idResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', '잘못된 ID입니다')
  }

  let existing
  try {
    existing = findRecordById(idResult.id)
  } catch (error) {
    console.error('[PATCH /api/records/[id]] 조회 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 조회에 실패했습니다')
  }
  if (!existing) {
    return apiError(404, 'NOT_FOUND', NOT_FOUND_MESSAGE)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('[PATCH /api/records/[id]] FormData 파싱 실패', error)
    return apiError(400, 'VALIDATION_ERROR', '요청 형식이 올바르지 않습니다')
  }

  // raw_text가 포함되어도 updateRecordSchema에 없는 키라 파싱 결과에서 자동으로 빠진다 (F1-5)
  const { fields, photos } = readRecordForm(formData)

  const parsed = updateRecordSchema.safeParse(fields)
  if (!parsed.success) {
    return apiError(
      400,
      'VALIDATION_ERROR',
      '입력값을 확인해주세요',
      zodErrorToFields(parsed.error)
    )
  }

  const precheck = precheckPhotos(photos)
  if (!precheck.ok) {
    return precheckErrorResponse(precheck)
  }

  let saved
  try {
    saved = await savePhotos(photos)
  } catch (error) {
    const response = photoErrorResponse(error)
    if (response) return response
    console.error('[PATCH /api/records/[id]] 사진 저장 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '사진 저장에 실패했습니다')
  }

  // parsed.data는 실제로 보낸 텍스트 키만 담고 있으므로 그대로 patch에 쓴다.
  // 사진은 새로 저장에 성공한 슬롯만 키를 추가한다 (updateRecord는 존재하는 키만 SET)
  const patch: UpdateRecordPatch = { ...parsed.data }
  if (saved.barcode_photo) patch.barcode_photo = saved.barcode_photo
  if (saved.product_photo) patch.product_photo = saved.product_photo
  if (saved.lighting_photo) patch.lighting_photo = saved.lighting_photo

  let updated
  try {
    updated = updateRecord(idResult.id, patch)
  } catch (error) {
    // DB 갱신 실패: 새로 저장한 파일만 삭제하고 기존 파일은 보존한다 (Q5)
    await rollbackSavedPhotos(saved)
    console.error('[PATCH /api/records/[id]] 기록 갱신 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 갱신에 실패했습니다')
  }

  if (!updated) {
    // 갱신 직전 다른 요청이 이미 삭제한 경우: 새로 저장한 파일을 남겨둘 이유가 없다
    await rollbackSavedPhotos(saved)
    return apiError(404, 'NOT_FOUND', NOT_FOUND_MESSAGE)
  }

  // DB 갱신 성공 후에만 교체된 슬롯의 이전 파일을 삭제한다 (Q5)
  if (saved.barcode_photo && existing.barcode_photo) {
    await deletePhoto(existing.barcode_photo)
  }
  if (saved.product_photo && existing.product_photo) {
    await deletePhoto(existing.product_photo)
  }
  if (saved.lighting_photo && existing.lighting_photo) {
    await deletePhoto(existing.lighting_photo)
  }

  return NextResponse.json(toRecordDto(updated))
}

// DELETE /api/records/[id]: DB row 삭제 후 사진 파일 3개를 삭제한다 (F4-4)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idResult = parseId(id)
  if (!idResult.ok) {
    return apiError(400, 'VALIDATION_ERROR', '잘못된 ID입니다')
  }

  let deleted
  try {
    deleted = deleteRecord(idResult.id)
  } catch (error) {
    console.error('[DELETE /api/records/[id]] 삭제 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 삭제에 실패했습니다')
  }
  if (!deleted) {
    return apiError(404, 'NOT_FOUND', NOT_FOUND_MESSAGE)
  }

  if (deleted.barcode_photo) await deletePhoto(deleted.barcode_photo)
  if (deleted.product_photo) await deletePhoto(deleted.product_photo)
  if (deleted.lighting_photo) await deletePhoto(deleted.lighting_photo)

  return new NextResponse(null, { status: 204 })
}
