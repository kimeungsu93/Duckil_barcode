'use client'

import Image from 'next/image'
import { useRef, type ChangeEvent } from 'react'
import { AlertCircle, Camera, Loader2, RotateCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PhotoSlotState =
  | { status: 'empty' }
  | { status: 'preview'; url: string }
  | { status: 'error'; error: string }

interface PhotoSlotProps {
  label: string
  // 슬롯별 촬영 안내 문구 (PRD F3). 지정하지 않으면 표시하지 않는다
  hint?: string
  state: PhotoSlotState
  // 촬영(재촬영) 요청. onFileSelected가 없을 때만 직접 상태를 바꾸는 용도로 쓴다 (상세 화면 하위 호환)
  onCapture: () => void
  // 파일이 선택되면 호출한다. 지정하면 숨김 파일 입력을 붙여 촬영 버튼이 실제 카메라/파일 선택을 연다(Task 015).
  // 지정하지 않으면 기존처럼 onCapture만 호출한다
  onFileSelected?: (file: File) => void
  // 지정하지 않으면 비우기 버튼을 숨긴다 (상세 화면은 사진 삭제 미지원, ROADMAP Q11)
  onClear?: () => void
  disabled?: boolean
  // 리사이즈 등 처리 중 여부 (onFileSelected를 쓸 때만 의미가 있다). 버튼을 비활성화하고 처리 중 표시를 한다
  busy?: boolean
}

// 바코드·제품 사진 슬롯 공용 정의 (PRD F3). photo-step·record-detail-view가 함께 쓴다
export const PHOTO_SLOTS: {
  kind: 'barcode' | 'product'
  label: string
  hint: string
}[] = [
  {
    kind: 'barcode',
    label: '바코드 사진',
    hint: '라벨과 검사 스티커가 보이게 가까이',
  },
  { kind: 'product', label: '제품 사진', hint: '제품 전체가 보이게 가로로' },
]

// 사진 1장 슬롯 (빈 상태 / 미리보기 / 오류)
export function PhotoSlot({
  label,
  hint,
  state,
  onCapture,
  onFileSelected,
  onClear,
  disabled = false,
  busy = false,
}: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // onFileSelected가 처리 중일 때만 busy를 의미 있게 반영한다
  const isBusy = busy && Boolean(onFileSelected)

  // 촬영 버튼 클릭 처리: onFileSelected가 있으면 숨김 파일 입력을 열고, 없으면 기존처럼 onCapture를 바로 호출한다
  function handlePick() {
    if (onFileSelected) {
      inputRef.current?.click()
      return
    }
    onCapture()
  }

  // 파일 선택 완료 처리: 첫 파일을 전달한 뒤 값을 비워 같은 파일도 다시 선택할 수 있게 한다
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (selected) onFileSelected?.(selected)
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
      {onFileSelected && (
        // 실제 UI에는 노출하지 않는 파일 입력. 버튼이 대신 클릭을 트리거한다
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          aria-hidden
          tabIndex={-1}
          className="hidden"
        />
      )}
      <div
        className={cn(
          'bg-muted relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-lg',
          state.status === 'error' && 'border-destructive border-2'
        )}
      >
        {state.status === 'preview' && (
          // 미리보기는 blob URL(Task 015)·API 경로도 오므로 최적화를 끈다. 가로로 긴 사진이 잘리지 않게 contain
          <Image
            src={state.url}
            alt={`${label} 미리보기`}
            fill
            sizes="(max-width: 480px) 100vw, 448px"
            unoptimized
            className="object-contain"
          />
        )}
        {state.status === 'empty' && (
          <Camera className="text-muted-foreground size-10" aria-hidden />
        )}
        {state.status === 'error' && (
          <div className="text-destructive flex flex-col items-center gap-2 px-4 text-center">
            <AlertCircle className="size-8" aria-hidden />
            <p role="alert" className="text-sm font-medium">
              {state.error}
            </p>
          </div>
        )}
      </div>
      {state.status === 'preview' ? (
        <div className={cn('grid gap-2', onClear && 'grid-cols-2')}>
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={handlePick}
            disabled={disabled || isBusy}
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <RotateCw />}
            {isBusy ? '처리 중...' : '재촬영'}
          </Button>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="touch"
              onClick={onClear}
              disabled={disabled || isBusy}
            >
              <X />
              비우기
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant={state.status === 'error' ? 'outline' : 'secondary'}
          size="touch"
          onClick={handlePick}
          disabled={disabled || isBusy}
        >
          {isBusy ? (
            <Loader2 className="animate-spin" />
          ) : state.status === 'error' ? (
            <RotateCw />
          ) : (
            <Camera />
          )}
          {isBusy
            ? '처리 중...'
            : state.status === 'error'
              ? '다시 촬영'
              : `${label} 촬영`}
        </Button>
      )}
    </div>
  )
}
