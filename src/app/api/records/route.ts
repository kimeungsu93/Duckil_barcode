// GET·POST /api/records - 기록 목록 조회·생성 (PRD §4)
import { NextRequest, NextResponse } from 'next/server'
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
  existsByProductLot,
  insertRecord,
  listRecords,
} from '@/lib/records-repo'
import { createRecordSchema, listQuerySchema } from '@/lib/schemas/record'
import type {
  CreateRecordResponse,
  RecordListResponse,
} from '@/lib/types/record'

export const runtime = 'nodejs'

// POST /api/records: multipart/form-data로 기록을 생성한다.
// 순서: 입력 검증 → 사진 사전 검사 → 사진 저장 → 중복 확인 → DB 저장 → 응답 (Q4, Q9)
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
  // 중복 판정은 trim한 값 기준 (Q9). 스키마가 이미 trim했으므로 그대로 사용한다
  const duplicate = existsByProductLot(product_no, lot)

  try {
    const row = insertRecord({
      raw_text,
      product_no,
      lot,
      memo: memo ?? null,
      barcode_photo: saved.barcode_photo ?? null,
      product_photo: saved.product_photo ?? null,
    })
    const body: CreateRecordResponse = { ...toRecordDto(row), duplicate }
    return NextResponse.json(body, { status: 201 })
  } catch (error) {
    // DB 저장 실패 시 이미 저장한 사진 파일을 롤백한다
    await rollbackSavedPhotos(saved)
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
