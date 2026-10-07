'use client'

import { useState } from 'react'
import { CalendarRange, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ExportStatus, type ExportStatusValue } from './export-status'
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { countRecordsInRange, downloadExport } from '@/lib/api/export-client'
import { ApiError } from '@/lib/api/records-client'
import {
  EXPORT_MAX_TOTAL,
  EXPORT_PART_SIZE,
  EXPORT_WARN_THRESHOLD,
} from '@/lib/constants'
import { MOCK_RECORDS } from '@/lib/mock/records'
import { exportQuerySchema } from '@/lib/schemas/export'
import { kstDayStart, kstNextDayStart, todayKstDate } from '@/lib/time'

export type ExportPreview =
  | 'generating'
  | 'empty'
  | 'warn'
  | 'over-limit'
  | 'error'

interface DateRange {
  from: string
  to: string
}

// 다운로드 1회 단위: 기간 + 500건 단위로 나눈 파일 번호(1부터)
type ExportPart = DateRange & { part: number }

// 건수를 파일 1개당 EXPORT_PART_SIZE건으로 나눈 파일 수
function countParts(total: number): number {
  return Math.max(1, Math.ceil(total / EXPORT_PART_SIZE))
}

// YYYY-MM-DD에 일수를 더한다. UTC로 계산해 브라우저 타임존 영향이 없다
function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// 빠른 선택 기간 (오늘 기준 KST)
const QUICK_RANGES: { label: string; range: () => DateRange }[] = [
  {
    label: '오늘',
    range: () => ({ from: todayKstDate(), to: todayKstDate() }),
  },
  {
    label: '최근 7일',
    range: () => ({ from: addDays(todayKstDate(), -6), to: todayKstDate() }),
  },
  {
    label: '이번 달',
    range: () => ({
      from: `${todayKstDate().slice(0, 8)}01`,
      to: todayKstDate(),
    }),
  },
]

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 더미 건수 확인: KST 기간 문자열 비교 (PRD §6). Task 019에서 GET /api/records?from&to로 교체 (ROADMAP Q6)
function createDummyCheckCount(preview: ExportPreview | null) {
  return async ({ from, to }: DateRange): Promise<number> => {
    await wait(400)
    if (preview === 'empty') return 0
    if (preview === 'warn') return EXPORT_WARN_THRESHOLD + 50
    if (preview === 'over-limit') return EXPORT_MAX_TOTAL + 100
    const start = kstDayStart(from)
    const end = kstNextDayStart(to)
    return MOCK_RECORDS.filter(
      record => record.created_at >= start && record.created_at < end
    ).length
  }
}

// 더미 다운로드 (preview 모드 전용). preview가 없으면 downloadExport(GET /api/export)를 쓴다
function createDummyDownload(preview: ExportPreview | null) {
  return async (): Promise<void> => {
    await wait(1500)
    if (preview === 'error') throw new Error('더미 생성 실패')
  }
}

interface ExportFormProps {
  preview: ExportPreview | null
  // 지정하지 않으면 preview 여부에 따라 더미 동작 또는 실제 API(export-client)를 쓴다
  onCheckCount?: (range: DateRange) => Promise<number>
  // 파일 1개(part번째 500건 구간)를 받는다. 성공 시 실제 파일명을 반환한다(더미는 void)
  onDownload?: (target: ExportPart) => Promise<string | void>
}

export function ExportForm({
  preview,
  onCheckCount,
  onDownload,
}: ExportFormProps) {
  // 미리보기에서는 바로 다운로드를 눌러볼 수 있게 기간을 채워 둔다
  const [range, setRange] = useState<DateRange>(() =>
    preview ? QUICK_RANGES[1].range() : { from: '', to: '' }
  )
  const [status, setStatus] = useState<ExportStatusValue>(
    preview === 'generating' ? 'generating' : 'idle'
  )
  const [count, setCount] = useState<number>()
  // 여러 파일로 나눠 받을 때 진행 상황 (현재 받는 파일 번호 / 전체 파일 수)
  const [progress, setProgress] = useState<{ current: number; total: number }>()
  const [warnOpen, setWarnOpen] = useState(false)
  const [checkCount] = useState(
    () =>
      onCheckCount ??
      (preview ? createDummyCheckCount(preview) : countRecordsInRange)
  )
  const [download] = useState(
    () =>
      onDownload ?? (preview ? createDummyDownload(preview) : downloadExport)
  )

  const filled = Boolean(range.from && range.to)
  const parsed = exportQuerySchema.safeParse(range)
  const rangeError = filled && !parsed.success ? parsed.error.issues[0] : null
  const busy = status === 'checking' || status === 'generating'
  // 기간 미선택·잘못된 기간이면 다운로드 불가 (PRD §5 S-내보내기-1)
  const canDownload = parsed.success && !busy

  function changeRange(next: Partial<DateRange>) {
    setRange(prev => ({ ...prev, ...next }))
    setStatus('idle')
  }

  // 서버 메모리 보호를 위해 EXPORT_PART_SIZE건씩 나눈 파일을 순서대로 하나씩 받는다 (ROADMAP Q3).
  // 중간에 실패하면 "다시 시도"는 실패한 파일부터 이어 받는다
  async function runDownload(parts: number, startPart = 1) {
    setStatus('generating')
    let part = startPart
    try {
      let filename: string | void = undefined
      for (; part <= parts; part++) {
        setProgress({ current: part, total: parts })
        filename = await download({ ...range, part })
      }
      setStatus('idle')
      setProgress(undefined)
      if (parts === 1) {
        toast.success('엑셀 파일이 준비되었습니다', {
          description: filename || `records_${range.from}_${range.to}.xlsx`,
        })
      } else {
        toast.success(`엑셀 파일 ${parts}개가 준비되었습니다`, {
          description: `${EXPORT_PART_SIZE}건씩 나눠 저장했습니다`,
        })
      }
    } catch (error) {
      setProgress(undefined)
      // 클라이언트 건수 확인을 건너뛰었거나 그 사이 건수가 늘어난 경우를 대비한 방어 처리
      if (error instanceof ApiError && error.code === 'TOO_MANY_RECORDS') {
        setStatus('over-limit')
        return
      }
      setStatus('idle')
      const failedPart = part
      toast.error(
        parts === 1
          ? '엑셀 생성에 실패했습니다'
          : `엑셀 생성에 실패했습니다 (${failedPart}/${parts}번째 파일)`,
        {
          action: {
            label: '다시 시도',
            onClick: () => void runDownload(parts, failedPart),
          },
        }
      )
    }
  }

  async function handleDownload() {
    if (!canDownload) return
    setStatus('checking')
    try {
      const total = await checkCount(range)
      setCount(total)
      if (total === 0) return setStatus('empty')
      if (total > EXPORT_MAX_TOTAL) return setStatus('over-limit')
      if (total > EXPORT_WARN_THRESHOLD) {
        setStatus('idle')
        setWarnOpen(true)
        return
      }
      await runDownload(countParts(total))
    } catch {
      setStatus('idle')
      toast.error('기록 건수를 확인하지 못했습니다', {
        action: { label: '다시 시도', onClick: () => void handleDownload() },
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium">빠른 선택</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_RANGES.map(quick => (
            <Button
              key={quick.label}
              type="button"
              variant="outline"
              size="touch"
              className="px-2"
              onClick={() => changeRange(quick.range())}
              disabled={busy}
            >
              {quick.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="export-from">시작일</Label>
          <Input
            id="export-from"
            type="date"
            value={range.from}
            max={range.to || undefined}
            onChange={event => changeRange({ from: event.target.value })}
            disabled={busy}
            className="h-12 px-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="export-to">종료일</Label>
          <Input
            id="export-to"
            type="date"
            value={range.to}
            min={range.from || undefined}
            onChange={event => changeRange({ to: event.target.value })}
            disabled={busy}
            aria-invalid={rangeError ? true : undefined}
            className="h-12 px-2 text-base"
          />
        </div>
        {rangeError && (
          <p role="alert" className="text-destructive col-span-2 text-sm">
            {rangeError.message}
          </p>
        )}
      </section>

      <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm">
        <CalendarRange
          className="text-muted-foreground size-5 shrink-0"
          aria-hidden
        />
        {parsed.success ? (
          <span>
            {range.from} ~ {range.to} 기록을 내보냅니다
          </span>
        ) : (
          <span className="text-muted-foreground">
            내보낼 기간을 선택해주세요
          </span>
        )}
      </div>

      <ExportStatus status={status} count={count} progress={progress} />

      <Button
        type="button"
        size="touch"
        className="w-full"
        onClick={() => void handleDownload()}
        disabled={!canDownload}
      >
        {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
        엑셀 다운로드
      </Button>

      <ConfirmDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        title="사진이 많아 생성에 시간이 걸릴 수 있습니다"
        description={
          countParts(count ?? 0) > 1
            ? `선택한 기간의 기록이 ${count}건입니다. ${EXPORT_PART_SIZE}건씩 엑셀 파일 ${countParts(count ?? 0)}개로 나눠 받습니다. 브라우저가 여러 파일 다운로드를 물으면 허용해주세요. 계속 진행하시겠습니까?`
            : `선택한 기간의 기록이 ${count ?? 0}건입니다. 계속 진행하시겠습니까?`
        }
        confirmLabel="계속 진행"
        onConfirm={() => void runDownload(countParts(count ?? 0))}
      />
    </div>
  )
}
