import Image from 'next/image'
import { AlertCircle, Camera, RotateCw, X } from 'lucide-react'
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
  // 촬영(재촬영) 요청. Phase 2는 더미, Task 015에서 파일 입력·리사이즈로 교체
  onCapture: () => void
  // 지정하지 않으면 비우기 버튼을 숨긴다 (상세 화면은 사진 삭제 미지원, ROADMAP Q11)
  onClear?: () => void
  disabled?: boolean
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
  onClear,
  disabled = false,
}: PhotoSlotProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-sm">{hint}</p>}
      </div>
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
            onClick={onCapture}
            disabled={disabled}
          >
            <RotateCw />
            재촬영
          </Button>
          {onClear && (
            <Button
              type="button"
              variant="ghost"
              size="touch"
              onClick={onClear}
              disabled={disabled}
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
          onClick={onCapture}
          disabled={disabled}
        >
          {state.status === 'error' ? <RotateCw /> : <Camera />}
          {state.status === 'error' ? '다시 촬영' : `${label} 촬영`}
        </Button>
      )}
    </div>
  )
}
