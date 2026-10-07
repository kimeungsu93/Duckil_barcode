// 클라이언트·서버 공용 스키마 - 서버 전용 코드(next/server, fs 등) import 금지
import { z } from 'zod'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// 실제 존재하는 날짜인지 확인 (예: 2026-02-30 거부)
function isValidDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

// YYYY-MM-DD 날짜 문자열
export const dateStringSchema = z
  .string({ error: '날짜를 입력해주세요' })
  .regex(DATE_PATTERN, { error: '날짜 형식은 YYYY-MM-DD입니다' })
  .refine(isValidDate, { error: '존재하지 않는 날짜입니다' })

// GET /api/export 쿼리
export const exportQuerySchema = z
  .object({
    from: dateStringSchema,
    to: dateStringSchema,
    // 500건 단위로 나눈 파일 중 몇 번째인지 (1부터, 생략 시 1)
    part: z.coerce
      .number({ error: '파일 번호는 숫자여야 합니다' })
      .int({ error: '파일 번호는 정수여야 합니다' })
      .min(1, { error: '파일 번호는 1 이상이어야 합니다' })
      .optional(),
  })
  .refine(data => data.from <= data.to, {
    error: '시작일은 종료일보다 늦을 수 없습니다',
    path: ['to'],
  })

export type ExportQuery = z.infer<typeof exportQuerySchema>
