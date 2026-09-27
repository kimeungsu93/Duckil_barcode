import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { EXPORT_HARD_LIMIT } from '@/lib/constants'

export type ExportStatusValue =
  | 'idle'
  | 'checking'
  | 'generating'
  | 'empty'
  | 'over-limit'

interface ExportStatusProps {
  status: ExportStatusValue
  // 상한 초과일 때 조회된 건수
  count?: number
}

// 내보내기 진행 상태 표시 (PRD §5 내보내기)
export function ExportStatus({ status, count }: ExportStatusProps) {
  if (status === 'checking' || status === 'generating') {
    return (
      <div
        role="status"
        className="bg-muted flex items-start gap-3 rounded-lg px-4 py-3"
      >
        <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden />
        <p className="text-sm">
          {status === 'checking'
            ? '기록 건수를 확인하는 중...'
            : '엑셀 생성 중... 사진이 많으면 시간이 걸릴 수 있습니다'}
        </p>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <Alert>
        <Inbox />
        <AlertTitle>선택한 기간에 기록이 없습니다</AlertTitle>
        <AlertDescription>기간을 다시 선택해주세요</AlertDescription>
      </Alert>
    )
  }

  if (status === 'over-limit') {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>기간을 좁혀주세요</AlertTitle>
        <AlertDescription>
          {count !== undefined && `선택한 기간의 기록이 ${count}건입니다. `}한
          번에 {EXPORT_HARD_LIMIT}건까지만 내보낼 수 있습니다.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
