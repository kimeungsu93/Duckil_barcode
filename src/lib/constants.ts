// 앱 전체 제한 수치의 단일 출처. 코드에 숫자 리터럴을 중복해 쓰지 않는다.

// 사진 업로드 (PRD §4)
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const
export type PhotoMimeType = (typeof PHOTO_ALLOWED_TYPES)[number]

// 클라이언트 리사이즈 (PRD §3 F3)
export const RESIZE_MAX_EDGE = 1600
export const RESIZE_JPEG_QUALITY = 0.8

// 입력 길이 (PRD §4 검증 표)
export const RAW_TEXT_MAX_LENGTH = 2000
export const FIELD_MAX_LENGTH = 100
export const MEMO_MAX_LENGTH = 500

// 목록 페이지네이션 (PRD §4 GET /api/records)
export const LIST_PAGE_SIZE = 20
export const LIST_MAX_LIMIT = 100

// Excel 내보내기 건수 제한 (ROADMAP Q3)
export const EXPORT_WARN_THRESHOLD = 200
export const EXPORT_HARD_LIMIT = 500

// 직접 입력으로 QR 원문이 없을 때 저장하는 raw_text (ROADMAP Q7)
export const MANUAL_RAW_TEXT = '[직접입력]'
