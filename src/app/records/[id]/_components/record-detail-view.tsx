'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { DeleteRecordButton } from './delete-record-button'
import {
  PHOTO_SLOTS,
  PhotoSlot,
  type PhotoSlotState,
} from '@/components/records/photo-slot'
import { RawTextBox } from '@/components/records/raw-text-box'
import { RecordFields } from '@/components/records/record-fields'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { MOCK_PHOTO_URL } from '@/lib/mock/records'
import { updateRecordSchema } from '@/lib/schemas/record'
import { formatKstDisplay, nowKstIso } from '@/lib/time'
import type { RecordDto } from '@/lib/types/record'

type PhotoKind = 'barcode' | 'product'
type UpdateInput = z.input<typeof updateRecordSchema>
type UpdateOutput = z.output<typeof updateRecordSchema>

export type DetailPreview = 'loading' | 'save-error'

export interface DetailSaveInput {
  fields: UpdateOutput
  // 재촬영으로 바뀐 사진만 담는다. 사진 삭제는 지원하지 않는다 (ROADMAP Q5·Q11)
  // Task 018에서 리사이즈된 Blob으로 교체
  photos: Partial<Record<PhotoKind, string>>
}

interface RecordDetailViewProps {
  record: RecordDto
  photoUrls: Record<PhotoKind, string | null>
  preview: DetailPreview | null
  // 지정하지 않으면 더미 동작을 쓴다 (Task 018에서 PATCH/DELETE API 연결)
  onSave?: (input: DetailSaveInput) => Promise<void>
  onDelete?: () => Promise<void>
}

// 더미 재촬영 이미지 (public/mock)
const DUMMY_PHOTO_URL: Record<PhotoKind, string> = MOCK_PHOTO_URL

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toSlotState(url: string | null): PhotoSlotState {
  return url ? { status: 'preview', url } : { status: 'empty' }
}

function slotUrl(state: PhotoSlotState): string | null {
  return state.status === 'preview' ? state.url : null
}

// 기록 상세 컨테이너: 수정·재촬영·삭제
export function RecordDetailView({
  record,
  photoUrls,
  preview,
  onSave,
  onDelete,
}: RecordDetailViewProps) {
  const router = useRouter()
  // 재촬영한 슬롯. URL이 같아도(더미) 재촬영하면 교체 대상으로 본다
  const [replaced, setReplaced] = useState<PhotoKind[]>([])
  const [photos, setPhotos] = useState<Record<PhotoKind, PhotoSlotState>>({
    barcode: toSlotState(photoUrls.barcode),
    product: toSlotState(photoUrls.product),
  })
  const [updatedAt, setUpdatedAt] = useState(record.updated_at)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const form = useForm<UpdateInput, unknown, UpdateOutput>({
    resolver: zodResolver(updateRecordSchema),
    defaultValues: {
      product_no: record.product_no,
      lot: record.lot,
      memo: record.memo ?? '',
    },
  })

  const dirty = form.formState.isDirty || replaced.length > 0

  async function save(input: DetailSaveInput) {
    if (onSave) return onSave(input)
    await wait(800)
    if (preview === 'save-error') throw new Error('더미 저장 실패')
  }

  async function handleSubmit(values: UpdateOutput) {
    setSaving(true)
    try {
      await save({
        fields: values,
        photos: Object.fromEntries(
          replaced.flatMap(kind => {
            const url = slotUrl(photos[kind])
            return url ? [[kind, url]] : []
          })
        ),
      })
      form.reset(values)
      setReplaced([])
      setUpdatedAt(nowKstIso())
      toast.success('저장되었습니다')
    } catch {
      // 입력값은 그대로 유지한다 (PRD §5 S-상세-4)
      toast.error('저장에 실패했습니다', {
        description: '입력한 내용은 그대로 남아 있습니다',
        action: {
          label: '다시 시도',
          onClick: () => void form.handleSubmit(handleSubmit)(),
        },
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (onDelete) await onDelete()
      else await wait(500)
      toast.success('삭제되었습니다')
      router.push('/')
    } catch {
      setDeleting(false)
      toast.error('삭제에 실패했습니다')
    }
  }

  const busy = saving || deleting

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt>등록</dt>
          <dd>{formatKstDisplay(record.created_at)}</dd>
          <dt>수정</dt>
          <dd>{formatKstDisplay(updatedAt)}</dd>
        </dl>
        <RawTextBox rawText={record.raw_text} />
        <RecordFields disabled={busy} />
        {PHOTO_SLOTS.map(({ kind, label, hint }) => (
          <PhotoSlot
            key={kind}
            label={label}
            hint={hint}
            state={photos[kind]}
            // 더미 재촬영: 같은 샘플 이미지로 교체 (Task 015에서 촬영·리사이즈 연결)
            onCapture={() => {
              setPhotos(prev => ({
                ...prev,
                [kind]: { status: 'preview', url: DUMMY_PHOTO_URL[kind] },
              }))
              setReplaced(prev =>
                prev.includes(kind) ? prev : [...prev, kind]
              )
            }}
            disabled={busy}
          />
        ))}
        <DeleteRecordButton deleting={deleting} onDelete={handleDelete} />

        {/* 하단 고정 저장 바 높이만큼 여백 */}
        <div aria-hidden className="h-20" />
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-[calc(var(--tab-bar-h)+env(safe-area-inset-bottom))] z-30 border-t backdrop-blur">
          <div className="mx-auto max-w-[480px] px-4 py-3">
            <Button
              type="submit"
              size="touch"
              className="w-full"
              disabled={busy || !dirty}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? '저장 중...' : dirty ? '저장' : '변경 사항 없음'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
