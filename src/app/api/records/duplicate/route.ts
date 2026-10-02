// GET /api/records/duplicate?raw_text= - 원본 바코드 중복 즉시 확인 (Phase 7 Task 025)
// 스캔 직후 확인 단계로 넘어가기 전에 호출한다. 최종 차단은 POST /api/records의 409가 맡는다
import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { RAW_TEXT_MAX_LENGTH } from '@/lib/constants'
import { toDuplicateSummary } from '@/lib/record-mapper'
import { findByRawText } from '@/lib/records-repo'
import type { DuplicateCheckResponse } from '@/lib/types/record'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const rawText = request.nextUrl.searchParams.get('raw_text') ?? ''
  if (rawText.length > RAW_TEXT_MAX_LENGTH) {
    return apiError(400, 'VALIDATION_ERROR', '원본 바코드가 너무 깁니다')
  }

  try {
    const row = findByRawText(rawText)
    const body: DuplicateCheckResponse = row
      ? { duplicate: true, existing: toDuplicateSummary(row) }
      : { duplicate: false }
    return NextResponse.json(body)
  } catch (error) {
    console.error('[GET /api/records/duplicate] 조회 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '중복 확인에 실패했습니다')
  }
}
