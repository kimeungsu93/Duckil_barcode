import { cn } from '@/lib/utils'

interface ScannerViewProps {
  // Phase 4(Task 014)에서 카메라 video 요소를 넣는 자리
  children?: React.ReactNode
  hint?: string
  className?: string
}

// 카메라 영역 + 조준 사각형. 스캐너는 조준 사각형 주변을 잘라 디코딩한다
export function ScannerView({
  children,
  hint = '코드를 사각형 안에 맞춰주세요',
  className,
}: ScannerViewProps) {
  return (
    <div
      className={cn(
        'bg-muted relative aspect-[3/4] w-full overflow-hidden rounded-lg',
        className
      )}
    >
      {children}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
        {/* 크기(size-3/5 max-w-64)를 바꾸면 src/lib/scan-roi.ts의 AIM_* 상수도 함께 바꾼다 (디코딩 영역) */}
        <div
          aria-hidden
          className="border-primary/80 size-3/5 max-w-64 rounded-lg border-2 shadow-[0_0_0_9999px_rgb(0_0_0/0.25)]"
        />
        <p className="bg-background/80 text-foreground rounded-full px-3 py-1 text-sm font-medium">
          {hint}
        </p>
      </div>
    </div>
  )
}
