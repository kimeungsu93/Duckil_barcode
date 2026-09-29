'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ScanLine } from 'lucide-react'
import {
  RecordList,
  type RecordListItemData,
  type RecordListStatus,
} from './record-list'
import { RecordSearch } from './record-search'
import { Button } from '@/components/ui/button'
import { useRecords } from '@/hooks/use-records'
import { photoUrl } from '@/lib/api/records-client'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { unlockAudio } from '@/lib/feedback'
import { MOCK_RECORDS, mockPhotoUrl } from '@/lib/mock/records'
import type { RecordDto } from '@/lib/types/record'

export type HomePreview = 'loading' | 'empty' | 'no-result' | 'error'

interface HomeViewProps {
  preview: HomePreview | null
  initialQuery: string
}

// no-result 미리보기에서 검색어가 비어 있을 때 쓰는 예시 검색어
const NO_RESULT_SAMPLE_QUERY = 'ZZZ-NONE'

// 스캔 화면 진입 전에 효과음을 미리 활성화해둔다 (PRD F1-2)
function ScanStartButton() {
  return (
    <Button asChild size="touch" className="w-full">
      <Link href="/scan" onClick={() => unlockAudio()}>
        <ScanLine />
        스캔 시작
      </Link>
    </Button>
  )
}

// 홈 화면 컨테이너. preview 쿼리가 있으면 더미 상태를 보여주고(§5 S-홈-1~4 확인용),
// 없으면 API에 연결한다. 훅을 조건부로 호출할 수 없으므로 두 경로를 하위 컴포넌트로 나눈다
export function HomeView({ preview, initialQuery }: HomeViewProps) {
  if (preview) {
    return <HomeViewPreview preview={preview} initialQuery={initialQuery} />
  }
  return <HomeViewLive initialQuery={initialQuery} />
}

// ---------------------------------------------------------------------------
// API 연동 경로 (일반 경로). mock을 import하지 않는다
// ---------------------------------------------------------------------------

// 썸네일은 바코드 사진을 우선하고, 없으면 제품 사진을 쓴다. 둘 다 없으면 null
function toListItem(record: RecordDto): RecordListItemData {
  const filename = record.barcode_photo ?? record.product_photo
  return {
    record,
    thumbnailUrl: filename ? photoUrl(filename) : null,
  }
}

function HomeViewLive({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const { items, total, status, loadMore, retry } = useRecords(query)

  const listItems = useMemo(() => items.map(toListItem), [items])

  // 기록이 하나도 없으면 빈 상태 안의 스캔 시작 버튼만 강조해서 보여준다 (PRD §5 S-홈-2)
  const isEmpty = status === 'ready' && total === 0 && !query.trim()

  return (
    <div className="flex flex-col gap-4">
      {!isEmpty && <ScanStartButton />}
      <RecordSearch value={query} onChange={setQuery} />
      <RecordList
        items={listItems}
        total={total}
        status={status}
        query={query}
        onLoadMore={loadMore}
        onRetry={retry}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// preview 전용 더미 경로 (개발 모드 상태 확인용). API를 호출하지 않는다
// ---------------------------------------------------------------------------

// Product No/Lot 부분 일치, 대소문자 무시 검색 (PRD F4-3, 더미 데이터 전용)
function filterMockRecords(records: RecordDto[], query: string): RecordDto[] {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return records
  return records.filter(
    record =>
      record.product_no.toLowerCase().includes(keyword) ||
      record.lot.toLowerCase().includes(keyword)
  )
}

function HomeViewPreview({
  preview,
  initialQuery,
}: {
  preview: HomePreview
  initialQuery: string
}) {
  const [query, setQuery] = useState(
    preview === 'no-result' && !initialQuery
      ? NO_RESULT_SAMPLE_QUERY
      : initialQuery
  )
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE)
  const [status, setStatus] = useState<RecordListStatus>(
    preview === 'loading' ? 'loading' : preview === 'error' ? 'error' : 'ready'
  )

  const toMockListItem = (record: RecordDto): RecordListItemData => ({
    record,
    thumbnailUrl:
      mockPhotoUrl(record.barcode_photo, 'barcode') ??
      mockPhotoUrl(record.product_photo, 'product'),
  })

  const filtered = useMemo(() => {
    if (preview === 'empty') return []
    if (preview === 'no-result') return []
    return filterMockRecords(MOCK_RECORDS, query)
  }, [preview, query])

  const items = useMemo(
    () => filtered.slice(0, visibleCount).map(toMockListItem),
    [filtered, visibleCount]
  )

  // 기록이 하나도 없으면 빈 상태 안의 스캔 시작 버튼만 강조해서 보여준다 (PRD §5 S-홈-2)
  const isEmpty = status === 'ready' && filtered.length === 0 && !query.trim()

  function handleQueryChange(value: string) {
    setQuery(value)
    setVisibleCount(LIST_PAGE_SIZE)
  }

  // 더미: 다시 시도하면 정상 목록으로 돌아간다
  function handleRetry() {
    setStatus('ready')
  }

  return (
    <div className="flex flex-col gap-4">
      {!isEmpty && <ScanStartButton />}
      <RecordSearch value={query} onChange={handleQueryChange} />
      <RecordList
        items={items}
        total={filtered.length}
        status={status}
        query={preview === 'empty' ? '' : query}
        onLoadMore={() => setVisibleCount(count => count + LIST_PAGE_SIZE)}
        onRetry={handleRetry}
      />
    </div>
  )
}
