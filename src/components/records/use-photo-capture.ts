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

export interface UsePhotoCaptureOptions {
  // 상세 화면(Task 018)에서 기존 사진 URL로 시작할 때 쓴다. blob URL이 아니라 API 경로이므로
  // revoke 대상이 아니다. 지정하지 않으면 기존처럼 빈 상태(scan-flow)로 시작한다
  initialUrl?: string | null
}

// initialUrl이 있으면 미리보기 상태로, 없으면 빈 상태로 시작한다 (reset()에서도 같은 기준을 쓴다)
function initialSlotFor(initialUrl: string | null): PhotoSlotState {
  return initialUrl ? { status: 'preview', url: initialUrl } : EMPTY_SLOT
}

// 사진 슬롯 1개의 선택·리사이즈·미리보기 상태를 관리하는 범용 훅.
// scan-flow(Task 016)와 상세 화면(Task 018)이 함께 재사용할 수 있게 PhotoSlot 전용 의존성 없이 만든다
export function usePhotoCapture(
  options: UsePhotoCaptureOptions = {}
): UsePhotoCaptureResult {
  const initialUrl = options.initialUrl ?? null
  const [slot, setSlot] = useState<PhotoSlotState>(() =>
    initialSlotFor(initialUrl)
  )
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  // 현재 미리보기로 쓰고 있는 objectURL. 교체·정리 시점에 revoke하기 위해 추적한다 (initialUrl은 제외)
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

  // 초기 상태(빈 상태 또는 initialUrl 미리보기)로 되돌린다. clear()는 항상 빈 상태로 보내지만
  // reset()은 initialUrl이 있으면 그 미리보기로 되돌아간다는 점이 다르다
  const reset = useCallback(() => {
    requestIdRef.current += 1
    revokeCurrent()
    setFile(null)
    setSlot(initialSlotFor(initialUrl))
    setBusy(false)
  }, [revokeCurrent, initialUrl])

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

  return { slot, file, busy, select, clear, setError, reset }
}
