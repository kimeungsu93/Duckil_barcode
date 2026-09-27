import { AlertCircle, RotateCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title: string
  description?: string
  // 지정하면 다시 시도 버튼을 표시한다
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-3">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </Alert>
      {onRetry && (
        <Button variant="outline" size="touch" onClick={onRetry}>
          <RotateCw />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
