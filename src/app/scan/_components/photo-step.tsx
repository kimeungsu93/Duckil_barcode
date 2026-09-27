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
      <div className="flex flex-col gap-2">
        <Button type="button" size="touch" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {saving ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="touch"
          onClick={onBack}
          disabled={saving}
        >
          <ArrowLeft />
          정보 수정
        </Button>
      </div>
    </div>
  )
}
