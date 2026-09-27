import Link from 'next/link'
import { Inbox, ScanLine, SearchX } from 'lucide-react'
import { RecordListItem } from './record-list-item'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { ListSkeleton } from '@/components/states/list-skeleton'
import { Button } from '@/components/ui/button'
import type { RecordDto } from '@/lib/types/record'

export type RecordListStatus = 'loading' | 'ready' | 'error'

export interface RecordListItemData {
  record: RecordDto
  thumbnailUrl: string | null
}

interface RecordListProps {
  items: RecordListItemData[]
  // 검색 조건에 맞는 전체 건수 (더 보기 표시 여부 판단)
  total: number
  status: RecordListStatus
  query: string
  onLoadMore: () => void
  onRetry: () => void
}

// 홈 목록 표현 컴포넌트. 데이터 공급원(더미/API)과 무관하게 props로만 그린다
export function RecordList({
  items,
  total,
  status,
  query,
  onLoadMore,
  onRetry,
}: RecordListProps) {
  if (status === 'loading') return <ListSkeleton />

  if (status === 'error') {
    return <ErrorState title="목록을 불러오지 못했습니다" onRetry={onRetry} />
  }

  if (items.length === 0) {
    if (query.trim()) {
      return <EmptyState icon={SearchX} title="검색 결과가 없습니다" />
    }
    return (
      <EmptyState
        icon={Inbox}
        title="아직 기록이 없습니다"
        description="제품 QR을 스캔해 첫 기록을 남겨보세요"
        action={
          <Button asChild size="touch" className="w-full">
            <Link href="/scan">
              <ScanLine />
              스캔 시작
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">총 {total}건</p>
      <ul className="divide-y">
        {items.map(item => (
          <li key={item.record.id}>
            <RecordListItem
              record={item.record}
              thumbnailUrl={item.thumbnailUrl}
            />
          </li>
        ))}
      </ul>
      {items.length < total && (
        <Button variant="outline" size="touch" onClick={onLoadMore}>
          더 보기 ({items.length}/{total})
        </Button>
      )}
    </div>
  )
}
