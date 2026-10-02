// Route Handler 전용 에러 응답 헬퍼 (next/server 의존). 스키마·클라이언트 코드에서 import 금지
import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/types/api'
import type { DuplicateRecordSummary } from '@/lib/types/record'

// PRD §4 공통 에러 포맷 응답 생성
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: fields ? { code, message, fields } : { code, message },
  }
  return NextResponse.json(body, { status })
}

// 원본 바코드 중복 409 응답. 클라이언트가 기존 기록 요약을 보여줄 수 있게 existing을 담는다
export function duplicateRawError(
  existing: DuplicateRecordSummary
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    error: {
      code: 'DUPLICATE_RAW_TEXT',
      message: '이미 등록된 바코드입니다',
      existing,
    },
  }
  return NextResponse.json(body, { status: 409 })
}

// ZodError를 필드별 첫 메시지 맵으로 변환 (예: { product_no: 'Product No를 입력해주세요' })
export function zodErrorToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_root'
    if (!(key in fields)) fields[key] = issue.message
  }
  return fields
}
