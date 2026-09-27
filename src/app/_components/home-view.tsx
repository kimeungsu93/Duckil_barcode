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
import { LIST_PAGE_SIZE } from '@/lib/constants'
import { MOCK_RECORDS, mockPhotoUrl } from '@/lib/mock/records'
import type { RecordDto } from '@/lib/types/record'

export type HomePreview = 'loading' | 'empty' | 'no-result' | 'error'

interface HomeViewProps {
  preview: HomePreview | null
  initialQuery: string
}

// no-result 미리보기에서 검색어가 비어 있을 때 쓰는 예시 검색어
const NO_RESULT_SAMPLE_QUERY = 'ZZZ-NONE'

// Product No/Lot 부분 일치, 대소문자 무시 검색 (PRD F4-3, 더미 데이터 전용)
function filterRecords(records: RecordDto[], query: string): RecordDto[] {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return records
  return records.filter(
    record =>
      record.product_no.toLowerCase().includes(keyword) ||
      record.lot.toLowerCase().includes(keyword)
  )
}

// 썸네일은 바코드 사진을 우선하고, 없으면 제품 사진을 쓴다
function toListItem(record: RecordDto): RecordListItemData {
  return {
    record,
    thumbnailUrl:
      mockPhotoUrl(record.barcode_photo, 'barcode') ??
      mockPhotoUrl(record.product_photo, 'product'),
  }
}

// 홈 화면 컨테이너. Phase 2는 더미 데이터로 목록을 채우고, Task 017에서 API로 교체한다
export function HomeView({ preview, initialQuery }: HomeViewProps) {
  const [query, setQuery] = useState(
    preview === 'no-result' && !initialQuery
      ? NO_RESULT_SAMPLE_QUERY
      : initialQuery
  )
  const [visibleCount, setVisibleCount] = useState(LIST_PAGE_SIZE)
  const [status, setStatus] = useState<RecordListStatus>(
    preview === 'loading' ? 'loading' : preview === 'error' ? 'error' : 'ready'
  )

  const filtered = useMemo(() => {
    if (preview === 'empty') return []
    if (preview === 'no-result') return []
    return filterRecords(MOCK_RECORDS, query)
  }, [preview, query])

  const items = useMemo(
    () => filtered.slice(0, visibleCount).map(toListItem),
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
      {!isEmpty && (
        <Button asChild size="touch" className="w-full">
          <Link href="/scan">
            <ScanLine />
            스캔 시작
          </Link>
        </Button>
      )}
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
