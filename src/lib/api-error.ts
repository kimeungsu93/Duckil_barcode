// Route Handler 전용 에러 응답 헬퍼 (next/server 의존). 스키마·클라이언트 코드에서 import 금지
import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/types/api'

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

// ZodError를 필드별 첫 메시지 맵으로 변환 (예: { product_no: 'Product No를 입력해주세요' })
export function zodErrorToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_root'
    if (!(key in fields)) fields[key] = issue.message
  }
  return fields
}
