'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoSlotState } from '@/components/records/photo-slot'
import { PHOTO_DECODE_ERROR } from '@/lib/constants'
import { resizeImage } from '@/lib/image-resize'

export interface UsePhotoCaptureResult {
  slot: PhotoSlotState
  file: File | null
  busy: boolean
  select: (file: File) => Promise<void>
  clear: () => void
  setError: (message: string) => void
  reset: () => void
}

const EMPTY_SLOT: PhotoSlotState = { status: 'empty' }

// 사진 슬롯 1개의 선택·리사이즈·미리보기 상태를 관리하는 범용 훅.
// scan-flow(Task 016)와 상세 화면(Task 018)이 함께 재사용할 수 있게 PhotoSlot 전용 의존성 없이 만든다
export function usePhotoCapture(): UsePhotoCaptureResult {
  const [slot, setSlot] = useState<PhotoSlotState>(EMPTY_SLOT)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  // 현재 미리보기로 쓰고 있는 objectURL. 교체·정리 시점에 revoke하기 위해 추적한다
  const urlRef = useRef<string | null>(null)
  // 마지막 select 호출의 결과만 반영하기 위한 순번 (연속 선택 시 경쟁 상태 방지)
  const requestIdRef = useRef(0)

  const revokeCurrent = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const select = useCallback(
    async (input: File) => {
      const requestId = ++requestIdRef.current
      setBusy(true)
      try {
        // 리사이즈 → 이전 objectURL revoke → 새 미리보기 순서로 진행한다
        const resized = await resizeImage(input)
        if (requestId !== requestIdRef.current) return // 그 사이 더 최신 선택이 들어왔다면 이 결과는 버린다

        revokeCurrent()
        const url = URL.createObjectURL(resized)
        urlRef.current = url
        setFile(resized)
        setSlot({ status: 'preview', url })
      } catch {
        if (requestId !== requestIdRef.current) return

        revokeCurrent()
        setFile(null)
        setSlot({ status: 'error', error: PHOTO_DECODE_ERROR })
      } finally {
        if (requestId === requestIdRef.current) setBusy(false)
      }
    },
    [revokeCurrent]
  )

  const clear = useCallback(() => {
    requestIdRef.current += 1 // 진행 중이던 select 결과가 있다면 무시시킨다
    revokeCurrent()
    setFile(null)
    setSlot(EMPTY_SLOT)
    setBusy(false)
  }, [revokeCurrent])

  const setError = useCallback(
    (message: string) => {
      requestIdRef.current += 1
      revokeCurrent()
      setFile(null)
      setSlot({ status: 'error', error: message })
      setBusy(false)
    },
    [revokeCurrent]
  )

  // 언마운트 시 마지막 objectURL을 정리한다
  useEffect(() => {
    return () => revokeCurrent()
  }, [revokeCurrent])

  return { slot, file, busy, select, clear, setError, reset: clear }
}
