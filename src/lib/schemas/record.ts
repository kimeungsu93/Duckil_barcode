// 클라이언트·서버 공용 스키마 - 서버 전용 코드(next/server, fs 등) import 금지
import { z } from 'zod'
import {
  FIELD_MAX_LENGTH,
  LIST_MAX_LIMIT,
  LIST_PAGE_SIZE,
  MEMO_MAX_LENGTH,
  RAW_TEXT_MAX_LENGTH,
} from '@/lib/constants'
import { dateStringSchema } from '@/lib/schemas/export'

const rawTextSchema = z
  .string({ error: 'QR 원문이 필요합니다' })
  .min(1, { error: 'QR 원문이 필요합니다' })
  .max(RAW_TEXT_MAX_LENGTH, {
    error: `QR 원문은 ${RAW_TEXT_MAX_LENGTH}자 이하여야 합니다`,
  })

const productNoSchema = z
  .string({ error: 'Product No를 입력해주세요' })
  .trim()
  .min(1, { error: 'Product No를 입력해주세요' })
  .max(FIELD_MAX_LENGTH, {
    error: `Product No는 ${FIELD_MAX_LENGTH}자 이하여야 합니다`,
  })

const lotSchema = z
  .string({ error: 'Lot을 입력해주세요' })
  .trim()
  .min(1, { error: 'Lot을 입력해주세요' })
  .max(FIELD_MAX_LENGTH, {
    error: `Lot은 ${FIELD_MAX_LENGTH}자 이하여야 합니다`,
  })

const memoSchema = z.string().max(MEMO_MAX_LENGTH, {
  error: `메모는 ${MEMO_MAX_LENGTH}자 이하여야 합니다`,
})

// POST /api/records 텍스트 필드 (사진 파일은 photo.ts의 checkPhotoFile로 검사)
export const createRecordSchema = z.object({
  raw_text: rawTextSchema,
  product_no: productNoSchema,
  lot: lotSchema,
  memo: memoSchema.optional(),
})

// PATCH /api/records/[id] 텍스트 필드. raw_text는 생성 후 변경 불가라 포함하지 않는다
export const updateRecordSchema = z.object({
  product_no: productNoSchema.optional(),
  lot: lotSchema.optional(),
  memo: memoSchema.optional(),
})

// 경로 파라미터 id
export const recordIdSchema = z.coerce
  .number({ error: '잘못된 ID입니다' })
  .int({ error: '잘못된 ID입니다' })
  .min(1, { error: '잘못된 ID입니다' })

// GET /api/records 쿼리. from/to는 내보내기 전 건수 확인용 (ROADMAP Q6)
export const listQuerySchema = z
  .object({
    q: z.string().trim().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(LIST_MAX_LIMIT, {
        error: `limit은 ${LIST_MAX_LIMIT} 이하여야 합니다`,
      })
      .default(LIST_PAGE_SIZE),
    offset: z.coerce.number().int().min(0).default(0),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
  })
  .refine(data => !data.from || !data.to || data.from <= data.to, {
    error: '시작일은 종료일보다 늦을 수 없습니다',
    path: ['to'],
  })

export type CreateRecordInput = z.infer<typeof createRecordSchema>
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>
export type ListQuery = z.infer<typeof listQuerySchema>
