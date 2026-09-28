// GET /api/export - 기간 내 기록을 사진 썸네일 포함 xlsx로 내보내기 (PRD §4, ROADMAP Task 012)
import { NextRequest } from 'next/server'
import { apiError, zodErrorToFields } from '@/lib/api-error'
import { EXPORT_HARD_LIMIT } from '@/lib/constants'
import { buildExportWorkbook } from '@/lib/excel-export'
import { countRecordsInRange, listRecordsForExport } from '@/lib/records-repo'
import { exportQuerySchema } from '@/lib/schemas/export'

export const runtime = 'nodejs'

// GET /api/export?from=&to=: 기간 검증 → 건수 확인(하드 상한 500) → 워크북 생성 → xlsx 다운로드 응답
export async function GET(request: NextRequest) {
  const parsed = exportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!parsed.success) {
    return apiError(
      400,
      'VALIDATION_ERROR',
      '요청 파라미터를 확인해주세요',
      zodErrorToFields(parsed.error)
    )
  }

  const { from, to } = parsed.data

  const total = countRecordsInRange(from, to)
  if (total > EXPORT_HARD_LIMIT) {
    return apiError(
      422,
      'TOO_MANY_RECORDS',
      `내보내기 대상이 ${EXPORT_HARD_LIMIT}건을 초과했습니다. 기간을 좁혀주세요`
    )
  }

  try {
    const rows = listRecordsForExport(from, to)
    const buffer = await buildExportWorkbook(rows)

    // exceljs가 반환하는 Buffer가 최신 @types/node의 제네릭 Buffer와 선언 병합되며
    // Response의 BodyInit(URLSearchParams 등과의 유니언) 판별이 깨지므로, 실제로는
    // Uint8Array 호환 버퍼이기 때문에 이 지점만 타입을 좁혀 우회한다
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="records_${from}_${to}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/export] 엑셀 생성 실패', error)
    return apiError(500, 'INTERNAL_ERROR', '엑셀 생성에 실패했습니다')
  }
}
