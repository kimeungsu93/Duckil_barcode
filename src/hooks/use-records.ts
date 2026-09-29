'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounceValue } from 'usehooks-ts'
import { toast } from 'sonner'
import { ApiError, listRecords } from '@/lib/api/records-client'
import { LIST_PAGE_SIZE } from '@/lib/constants'
import type { RecordDto } from '@/lib/types/record'

export type RecordsStatus = 'loading' | 'ready' | 'error'

export interface UseRecordsResult {
  items: RecordDto[]
  total: number
  status: RecordsStatus
  // '더 보기' 요청이 진행 중인지 여부 (초기/검색 로딩과는 별개 상태)
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  retry: () => void
}

// 홈 목록·검색·더 보기를 GET /api/records에 연결하는 훅 (PRD F4-2·F4-3, §5 S-홈-1~4).
// - 검색어는 usehooks-ts useDebounceValue로 300ms 디바운스한다
// - 디바운스된 검색어가 바뀌면 offset 0부터 다시 조회한다
// - 요청 경쟁(오래된 응답이 최신 응답을 덮어쓰는 문제) 방지를 위해 AbortController로 이전 요청을 취소 표시하고,
//   요청 순번으로 최신 응답만 상태에 반영한다. 검색어가 바뀌면 진행 중이던 '더 보기' 요청도 같은 방식으로 무효화된다
//   (records-client.ts의 listRecords는 signal을 받지 않으므로 실제 네트워크 취소는 아니고, 응답 반영을 막는 논리적 취소다)
export function useRecords(query: string): UseRecordsResult {
  const [debouncedQuery] = useDebounceValue(query, 300)

  const [items, setItems] = useState<RecordDto[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<RecordsStatus>('loading')
  const [loadingMore, setLoadingMore] = useState(false)

  const requestSeqRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const runFetch = useCallback(
    (offset: number) => {
      // 이전 요청은 취소 표시하고, 이번 요청의 순번을 확보한다
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const seq = ++requestSeqRef.current

      if (offset === 0) {
        setStatus('loading')
      } else {
        setLoadingMore(true)
      }

      listRecords({ q: debouncedQuery, limit: LIST_PAGE_SIZE, offset })
        .then(res => {
          // 그 사이 더 최신 요청이 시작됐으면 이 응답은 버린다
          if (controller.signal.aborted || seq !== requestSeqRef.current) return
          setItems(prev => (offset === 0 ? res.items : [...prev, ...res.items]))
          setTotal(res.total)
          setStatus('ready')
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || seq !== requestSeqRef.current) return
          if (offset === 0) {
            setStatus('error')
          } else {
            // 더 보기 실패는 기존 목록을 유지하고 토스트로만 알린다
            const message =
              error instanceof ApiError
                ? error.message
                : '목록을 더 불러오지 못했습니다'
            toast.error(message)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted && seq === requestSeqRef.current) {
            setLoadingMore(false)
          }
        })
    },
    [debouncedQuery]
  )

  // 디바운스된 검색어가 바뀌면 처음부터 다시 조회한다
  useEffect(() => {
    runFetch(0)
    return () => {
      abortRef.current?.abort()
    }
  }, [runFetch])

  const hasMore = items.length < total

  const loadMore = useCallback(() => {
    if (loadingMore || status !== 'ready' || !hasMore) return
    runFetch(items.length)
  }, [loadingMore, status, hasMore, items.length, runFetch])

  const retry = useCallback(() => {
    runFetch(0)
  }, [runFetch])

  return { items, total, status, loadingMore, hasMore, loadMore, retry }
}
