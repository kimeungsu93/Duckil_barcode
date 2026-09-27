import { ArrowLeft, Loader2, Save } from 'lucide-react'
import type { PhotoKind } from './scan-flow'
import { PhotoSlot, type PhotoSlotState } from '@/components/records/photo-slot'
import { Button } from '@/components/ui/button'

interface PhotoStepProps {
  photos: Record<PhotoKind, PhotoSlotState>
  saving: boolean
  onCapture: (kind: PhotoKind) => void
  onClear: (kind: PhotoKind) => void
  onSave: () => void
  onBack: () => void
}

const SLOTS: { kind: PhotoKind; label: string }[] = [
  { kind: 'barcode', label: '바코드 사진' },
  { kind: 'product', label: '제품 사진' },
]

export function PhotoStep({
  photos,
  saving,
  onCapture,
  onClear,
  onSave,
  onBack,
}: PhotoStepProps) {
  return (
    <div className="flex flex-col gap-4">
      {SLOTS.map(({ kind, label }) => (
        <PhotoSlot
          key={kind}
          label={label}
          state={photos[kind]}
          onCapture={() => onCapture(kind)}
          onClear={() => onClear(kind)}
          disabled={saving}
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
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
