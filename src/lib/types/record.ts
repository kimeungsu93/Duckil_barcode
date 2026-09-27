// SQLite records 테이블 row (PRD §6)
export interface RecordRow {
  id: number
  raw_text: string
  product_no: string
  lot: string
  memo: string | null
  barcode_photo: string | null
  product_photo: string | null
  created_at: string
  updated_at: string
}

// API 응답용 기록 (PRD §4, snake_case). 현재는 RecordRow와 필드가 같지만
// DB 컬럼과 API 계약을 분리하기 위해 별도 타입으로 둔다.
export interface RecordDto {
  id: number
  raw_text: string
  product_no: string
  lot: string
  memo: string | null
  barcode_photo: string | null // 파일명(uuid.jpg)만 담는다
  product_photo: string | null
  created_at: string // KST ISO 8601 (+09:00)
  updated_at: string
}

// POST /api/records 응답. 중복이어도 저장은 되고 duplicate만 true (ROADMAP Q4)
export type CreateRecordResponse = RecordDto & { duplicate: boolean }

// GET /api/records 응답
export interface RecordListResponse {
  items: RecordDto[]
  total: number
}
