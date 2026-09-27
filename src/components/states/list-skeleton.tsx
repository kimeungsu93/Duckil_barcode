import { Skeleton } from '@/components/ui/skeleton'

interface ListSkeletonProps {
  count?: number
}

// 목록 로딩 중 자리표시 (썸네일 + 두 줄 텍스트)
export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
  return (
    <ul aria-busy="true" aria-label="불러오는 중" className="divide-y">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="size-16 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  )
}
