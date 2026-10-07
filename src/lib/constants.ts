// 앱 전체 제한 수치의 단일 출처. 코드에 숫자 리터럴을 중복해 쓰지 않는다.

// 사진 업로드 (PRD §4)
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const
export type PhotoMimeType = (typeof PHOTO_ALLOWED_TYPES)[number]

// 클라이언트 리사이즈 (PRD §3 F3)
export const RESIZE_MAX_EDGE = 1600
export const RESIZE_JPEG_QUALITY = 0.8

// 사진 디코딩 실패 안내 문구 (PRD §5 S-스캔-4, §8).
// scan-flow.tsx에 있던 동일 문자열 정의를 여기로 옮겨 공용화한다(Task 016에서 import로 교체)
export const PHOTO_DECODE_ERROR =
  '지원하지 않는 이미지 형식입니다. 다시 촬영해주세요'

// 입력 길이 (PRD §4 검증 표)
export const RAW_TEXT_MAX_LENGTH = 2000
export const FIELD_MAX_LENGTH = 100
export const MEMO_MAX_LENGTH = 500

// 목록 페이지네이션 (PRD §4 GET /api/records)
export const LIST_PAGE_SIZE = 20
export const LIST_MAX_LIMIT = 100

// Excel 내보내기 건수 제한 (ROADMAP Q3)
// 사진 원본을 워크북에 넣으므로 서버 메모리 보호를 위해 파일 1개당 500건씩 나눠 만든다.
// 전체 기간 상한(파일 10개)을 넘으면 "기간을 좁혀주세요"로 거부한다
export const EXPORT_WARN_THRESHOLD = 200
export const EXPORT_PART_SIZE = 500
export const EXPORT_MAX_TOTAL = 5000

// 직접 입력으로 QR 원문이 없을 때 저장하는 raw_text (ROADMAP Q7)
export const MANUAL_RAW_TEXT = '[직접입력]'
