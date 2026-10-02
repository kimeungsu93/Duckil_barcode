import { ArrowLeft, Loader2, Save } from 'lucide-react'
import type { PhotoKind } from './scan-flow'
import {
  PHOTO_SLOTS,
  PhotoSlot,
  type PhotoSlotState,
} from '@/components/records/photo-slot'
import { Button } from '@/components/ui/button'

interface PhotoStepProps {
  photos: Record<PhotoKind, PhotoSlotState>
  // 리사이즈 처리 중 여부(슬롯별). 저장 버튼은 처리 중에도 비활성화한다
  busy: Record<PhotoKind, boolean>
  saving: boolean
  onFileSelected: (kind: PhotoKind, file: File) => void
  onClear: (kind: PhotoKind) => void
  onSave: () => void
  onBack: () => void
}

export function PhotoStep({
  photos,
  busy,
  saving,
  onFileSelected,
  onClear,
  onSave,
  onBack,
}: PhotoStepProps) {
  const anyBusy = Object.values(busy).some(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {PHOTO_SLOTS.map(({ kind, label, hint }) => (
        <PhotoSlot
          key={kind}
          label={label}
          hint={hint}
          state={photos[kind]}
          // onFileSelected를 전달하므로 실제로는 호출되지 않는다 (PhotoSlot이 파일 입력을 대신 연다)
          onCapture={() => {}}
          onFileSelected={file => onFileSelected(kind, file)}
          onClear={() => onClear(kind)}
          disabled={saving}
          busy={busy[kind]}
        />
      ))}
      {/* 저장 버튼을 엄지가 닿는 하단에 고정한다 (스캔 화면은 탭 바가 없음) */}
      <div aria-hidden className="h-20" />
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-[480px] grid-cols-3 gap-2 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="touch"
            className="px-2"
            onClick={onBack}
            disabled={saving}
          >
            <ArrowLeft />
            이전
          </Button>
          <Button
            type="button"
            size="touch"
            className="col-span-2"
            onClick={onSave}
            disabled={saving || anyBusy}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
