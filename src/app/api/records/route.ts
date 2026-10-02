// GET·POST /api/records - 기록 목록 조회·생성 (PRD §4)
import { NextRequest, NextResponse } from 'next/server'
import { apiError, duplicateRawError, zodErrorToFields } from '@/lib/api-error'
import {
  photoErrorResponse,
  precheckErrorResponse,
  precheckPhotos,
  readRecordForm,
  rollbackSavedPhotos,
  savePhotos,
} from '@/lib/record-form'
import { toDuplicateSummary, toRecordDto } from '@/lib/record-mapper'
import {
  findByRawText,
  insertRecord,
  isRawKeyConflict,
  listRecords,
} from '@/lib/records-repo'
import { createRecordSchema, listQuerySchema } from '@/lib/schemas/record'
import type {
  CreateRecordResponse,
  RecordListResponse,
} from '@/lib/types/record'

export const runtime = 'nodejs'

// POST /api/records: multipart/form-data로 기록을 생성한다.
// 순서: 입력 검증 → 원본 바코드 중복 확인 → 사진 사전 검사 → 사진 저장 → DB 저장 → 응답.
// 원본 바코드가 이미 있으면 사진을 쓰기 전에 409로 거부한다 (Phase 7 Task 025)
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('[POST /api/records] FormData 파싱 실패', error)
    return apiError(400, 'VALIDATION_ERROR', '요청 형식이 올바르지 않습니다')
  }

  const { fields, photos } = readRecordForm(formData)

  const parsed = createRecordSchema.safeParse(fields)
  if (!parsed.success) {
    return apiError(
      400,
      'VALIDATION_ERROR',
      '입력값을 확인해주세요',
      zodErrorToFields(parsed.error)
    )
  }

  let existingRow
  try {
    existingRow = findByRawText(parsed.data.raw_text)
  } catch (error) {
    console.error('[POST /api/records] 중복 조회 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 저장에 실패했습니다')
  }
  if (existingRow) {
    return duplicateRawError(toDuplicateSummary(existingRow))
  }

  // 사진 사전 검사: 아무 파일도 쓰기 전에 MIME·크기를 먼저 확인한다
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
    console.error('[POST /api/records] 사진 저장 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '사진 저장에 실패했습니다')
  }

  const { raw_text, product_no, lot, memo } = parsed.data

  try {
    const row = insertRecord({
      raw_text,
      product_no,
      lot,
      memo: memo ?? null,
      barcode_photo: saved.barcode_photo ?? null,
      product_photo: saved.product_photo ?? null,
      lighting_photo: saved.lighting_photo ?? null,
    })
    const body: CreateRecordResponse = toRecordDto(row)
    return NextResponse.json(body, { status: 201 })
  } catch (error) {
    // DB 저장 실패 시 이미 저장한 사진 파일을 롤백한다
    await rollbackSavedPhotos(saved)
    // 사전 조회 뒤 같은 원문이 동시에 저장된 경우 UNIQUE 인덱스에 걸린다 → 같은 409로 응답
    if (isRawKeyConflict(error)) {
      const winner = findByRawText(raw_text)
      if (winner) return duplicateRawError(toDuplicateSummary(winner))
    }
    console.error('[POST /api/records] 기록 저장 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '기록 저장에 실패했습니다')
  }
}

// GET /api/records: 목록·검색 조회
export async function GET(request: NextRequest) {
  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!parsed.success) {
    return apiError(
      400,
      'VALIDATION_ERROR',
      '요청 파라미터를 확인해주세요',
      zodErrorToFields(parsed.error)
    )
  }

  try {
    const { rows, total } = listRecords(parsed.data)
    const body: RecordListResponse = { items: rows.map(toRecordDto), total }
    return NextResponse.json(body)
  } catch (error) {
    console.error('[GET /api/records] 목록 조회 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '목록 조회에 실패했습니다')
  }
}
