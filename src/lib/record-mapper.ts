// 서버 전용 - DB row → API DTO 매퍼. 현재는 필드가 동일하지만 DB 컬럼과 API 계약을
// 분리해두기 위해 매핑 함수를 거친다 (src/lib/types/record.ts 참고)
import 'server-only'
import type { RecordDto, RecordRow } from '@/lib/types/record'

export function toRecordDto(row: RecordRow): RecordDto {
  return {
    id: row.id,
    raw_text: row.raw_text,
    product_no: row.product_no,
    lot: row.lot,
    memo: row.memo,
    barcode_photo: row.barcode_photo,
    product_photo: row.product_photo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
