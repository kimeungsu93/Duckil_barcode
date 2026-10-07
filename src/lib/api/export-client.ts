// 브라우저 전용 - /api/export, /api/records(건수 확인) 호출용 fetch 래퍼.
// server-only 모듈(records-repo.ts, excel-export.ts 등)은 import하지 않는다.
import { ApiError, listRecords } from './records-client'
import type { ApiErrorBody } from '@/lib/types/api'

interface DateRange {
  from: string
  to: string
}

// GET /api/records?from&to&limit=1: 선택한 기간의 기록 건수를 조회한다 (ROADMAP Q6).
// 목록 자체는 필요 없으므로 limit=1로 요청하고 응답의 total만 사용한다
export async function countRecordsInRange({
  from,
  to,
}: DateRange): Promise<number> {
  const { total } = await listRecords({ from, to, limit: 1 })
  return total
}

// Content-Disposition 헤더에서 filename을 꺼낸다.
// attachment; filename="records_2026-01-01_2026-01-31.xlsx" 형태를 가정한다
function parseFilename(header: string | null): string | null {
  if (!header) return null
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i.exec(header)
  return match ? decodeURIComponent(match[1]) : null
}

// GET /api/export?from&to&part: part번째(1부터) 500건 구간의 xlsx 파일을 내려받아
// 브라우저에 저장하고 파일명을 반환한다
export async function downloadExport({
  from,
  to,
  part = 1,
}: DateRange & { part?: number }): Promise<string> {
  const params = new URLSearchParams({ from, to, part: String(part) })

  let res: Response
  try {
    res = await fetch(`/api/export?${params.toString()}`)
  } catch (error) {
    throw new ApiError(
      0,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '네트워크 요청에 실패했습니다'
    )
  }

  if (!res.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // 응답 본문이 JSON이 아니거나 비어있는 경우 INTERNAL_ERROR로 처리한다
      body = null
    }

    if (body?.error) {
      throw new ApiError(
        res.status,
        body.error.code,
        body.error.message,
        body.error.fields
      )
    }
    throw new ApiError(
      res.status,
      'INTERNAL_ERROR',
      `요청이 실패했습니다 (${res.status})`
    )
  }

  const blob = await res.blob()
  const filename =
    parseFilename(res.headers.get('Content-Disposition')) ??
    `records_${from}_${to}.xlsx`

  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }

  return filename
}
