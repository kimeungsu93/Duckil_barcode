import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  // 주요 행동 버튼 슬롯 (예: 스캔 시작)
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-4 py-12 text-center',
        className
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" aria-hidden />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      {action && <div className="mt-2 w-full">{action}</div>}
    </div>
  )
}
