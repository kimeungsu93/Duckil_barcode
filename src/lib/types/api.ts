// API 에러 코드 (PRD §4). 코드를 추가하면 src/lib/api-error.ts도 함께 확인한다.
export type ApiErrorCode =
  | 'VALIDATION_ERROR' // 400
  | 'INVALID_FILENAME' // 400
  | 'NOT_FOUND' // 404
  | 'PAYLOAD_TOO_LARGE' // 413
  | 'UNSUPPORTED_MEDIA_TYPE' // 415
  | 'TOO_MANY_RECORDS' // 422
  | 'INTERNAL_ERROR' // 500

// 공통 에러 응답 본문: { "error": { "code", "message", "fields"? } }
export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fields?: Record<string, string> // 필드별 검증 메시지
  }
}
