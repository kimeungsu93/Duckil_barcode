// SQLite records 테이블 row (PRD §6)
export interface RecordRow {
  id: number
  raw_text: string
  product_no: string
  lot: string
  memo: string | null
  barcode_photo: string | null
  product_photo: string | null
  lighting_photo: string | null // 점등 사진 (v3)
  raw_key: string | null // 중복 판정 키 (v2, src/lib/raw-key.ts). 직접 입력이면 NULL
  created_at: string
  updated_at: string
}

// API 응답용 기록 (PRD §4, snake_case). 내부 컬럼(raw_key)은 노출하지 않는다
export interface RecordDto {
  id: number
  raw_text: string
  product_no: string
  lot: string
  memo: string | null
  barcode_photo: string | null // 파일명(uuid.jpg)만 담는다
  product_photo: string | null
  lighting_photo: string | null
  created_at: string // KST ISO 8601 (+09:00)
  updated_at: string
}

// POST /api/records 응답 (원본 바코드가 중복이면 409 DUPLICATE_RAW_TEXT로 거부된다)
export type CreateRecordResponse = RecordDto

// 원본 바코드 중복 시 알려주는 기존 기록 요약 (409 응답, GET /api/records/duplicate)
export interface DuplicateRecordSummary {
  id: number
  product_no: string
  lot: string
  created_at: string
}

// GET /api/records/duplicate 응답
export interface DuplicateCheckResponse {
  duplicate: boolean
  existing?: DuplicateRecordSummary
}

// GET /api/records 응답
export interface RecordListResponse {
  items: RecordDto[]
  total: number
}
