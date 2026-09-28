import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { Skeleton } from '@/components/ui/skeleton'

// loading.tsx와 ?preview=loading이 함께 쓰는 상세 화면 스켈레톤
export function RecordDetailSkeleton() {
  return (
    <>
      <AppHeader title="기록 상세" backHref="/" />
      <main className="flex-1" aria-busy="true" aria-label="불러오는 중">
        <Container size="mobile" className="flex flex-col gap-4 py-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
          <Skeleton className="h-24 w-full" />
          <Skeleton className="aspect-[2/1] w-full" />
        </Container>
      </main>
    </>
  )
}
