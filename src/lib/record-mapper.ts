// 서버 전용 - DB row → API DTO 매퍼. 내부 컬럼(raw_key)은 빼고 API 계약 필드만 담는다
// (src/lib/types/record.ts 참고)
import 'server-only'
import type {
  DuplicateRecordSummary,
  RecordDto,
  RecordRow,
} from '@/lib/types/record'

export function toRecordDto(row: RecordRow): RecordDto {
  return {
    id: row.id,
    raw_text: row.raw_text,
    product_no: row.product_no,
    lot: row.lot,
    memo: row.memo,
    barcode_photo: row.barcode_photo,
    product_photo: row.product_photo,
    lighting_photo: row.lighting_photo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function toDuplicateSummary(row: RecordRow): DuplicateRecordSummary {
  return {
    id: row.id,
    product_no: row.product_no,
    lot: row.lot,
    created_at: row.created_at,
  }
}
