'use client'

import { useState } from 'react'
import { CalendarRange, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ExportStatus, type ExportStatusValue } from './export-status'
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXPORT_HARD_LIMIT, EXPORT_WARN_THRESHOLD } from '@/lib/constants'
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
    if (preview === 'over-limit') return EXPORT_HARD_LIMIT + 100
    const start = kstDayStart(from)
    const end = kstNextDayStart(to)
    return MOCK_RECORDS.filter(
      record => record.created_at >= start && record.created_at < end
    ).length
  }
}

// 더미 다운로드. Task 019에서 GET /api/export 파일 다운로드로 교체
function createDummyDownload(preview: ExportPreview | null) {
  return async (): Promise<void> => {
    await wait(1500)
    if (preview === 'error') throw new Error('더미 생성 실패')
  }
}

interface ExportFormProps {
  preview: ExportPreview | null
  // 지정하지 않으면 더미 동작을 쓴다 (Task 019에서 API 연결)
  onCheckCount?: (range: DateRange) => Promise<number>
  onDownload?: (range: DateRange) => Promise<void>
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
  const [warnOpen, setWarnOpen] = useState(false)
  const [checkCount] = useState(
    () => onCheckCount ?? createDummyCheckCount(preview)
  )
  const [download] = useState(() => onDownload ?? createDummyDownload(preview))

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

  async function runDownload() {
    setStatus('generating')
    try {
      await download(range)
      setStatus('idle')
      toast.success('엑셀 파일이 준비되었습니다', {
        description: `records_${range.from}_${range.to}.xlsx`,
      })
    } catch {
      setStatus('idle')
      toast.error('엑셀 생성에 실패했습니다', {
        action: { label: '다시 시도', onClick: () => void runDownload() },
      })
    }
  }

  async function handleDownload() {
    if (!canDownload) return
    setStatus('checking')
    try {
      const total = await checkCount(range)
      setCount(total)
      if (total === 0) return setStatus('empty')
      if (total > EXPORT_HARD_LIMIT) return setStatus('over-limit')
      if (total > EXPORT_WARN_THRESHOLD) {
        setStatus('idle')
        setWarnOpen(true)
        return
      }
      await runDownload()
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

      <ExportStatus status={status} count={count} />

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
        description={`선택한 기간의 기록이 ${count ?? 0}건입니다. 계속 진행하시겠습니까?`}
        confirmLabel="계속 진행"
        onConfirm={() => void runDownload()}
      />
    </div>
  )
}
