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
import { usePhotoCapture } from '@/components/records/use-photo-capture'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { ApiError, deleteRecord, updateRecord } from '@/lib/api/records-client'
import { MOCK_PHOTO_URL } from '@/lib/mock/records'
import { updateRecordSchema } from '@/lib/schemas/record'
import { formatKstDisplay, nowKstIso } from '@/lib/time'
import type { RecordDto } from '@/lib/types/record'

type PhotoKind = 'barcode' | 'product' | 'lighting'
type UpdateInput = z.input<typeof updateRecordSchema>
type UpdateOutput = z.output<typeof updateRecordSchema>
type UpdateFieldKey = keyof UpdateOutput

export type DetailPreview = 'loading' | 'save-error'

export interface DetailSaveInput {
  // 바뀐 필드만 담는다 (PATCH의 "보낸 필드만 갱신" 규칙과 맞춘다, F4-5)
  fields: UpdateOutput
  // 재촬영으로 바뀐 사진만 담는다. 사진 삭제는 지원하지 않는다 (ROADMAP Q5·Q11)
  photos: Partial<Record<PhotoKind, File>>
}

interface RecordDetailViewProps {
  record: RecordDto
  photoUrls: Record<PhotoKind, string | null>
  preview: DetailPreview | null
  // 지정하지 않으면 기본 동작(PATCH/DELETE API 연결, 프리뷰 모드는 더미 동작)을 쓴다
  onSave?: (input: DetailSaveInput) => Promise<void>
  onDelete?: () => Promise<void>
}

// 프리뷰(더미) 모드 전용 재촬영 이미지 (public/mock)
const DUMMY_PHOTO_URL: Record<PhotoKind, string> = MOCK_PHOTO_URL

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toSlotState(url: string | null): PhotoSlotState {
  return url ? { status: 'preview', url } : { status: 'empty' }
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
  const isPreview = preview !== null

  // 프리뷰 더미 재촬영 상태. URL이 같아도(더미) 재촬영하면 교체 대상으로 본다
  const [replaced, setReplaced] = useState<PhotoKind[]>([])
  const [photos, setPhotos] = useState<Record<PhotoKind, PhotoSlotState>>({
    barcode: toSlotState(photoUrls.barcode),
    product: toSlotState(photoUrls.product),
    lighting: toSlotState(photoUrls.lighting),
  })
  // 프리뷰 모드에서만 쓰는 표시용 수정 시각 (실제 모드는 저장 성공 후 router.refresh + key 리마운트로 갱신)
  const [updatedAt, setUpdatedAt] = useState(record.updated_at)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 실제 모드에서 쓰는 사진 슬롯. 훅 호출 순서를 지키기 위해 프리뷰 모드에서도 항상 호출한다
  const barcodePhoto = usePhotoCapture({ initialUrl: photoUrls.barcode })
  const productPhoto = usePhotoCapture({ initialUrl: photoUrls.product })
  const lightingPhoto = usePhotoCapture({ initialUrl: photoUrls.lighting })
  const photoCaptures = {
    barcode: barcodePhoto,
    product: productPhoto,
    lighting: lightingPhoto,
  }
  const photoKinds = Object.keys(photoCaptures) as PhotoKind[]

  const form = useForm<UpdateInput, unknown, UpdateOutput>({
    resolver: zodResolver(updateRecordSchema),
    defaultValues: {
      product_no: record.product_no,
      lot: record.lot,
      memo: record.memo ?? '',
    },
  })

  const photoChanged = isPreview
    ? replaced.length > 0
    : photoKinds.some(kind => photoCaptures[kind].file !== null)
  const dirty = form.formState.isDirty || photoChanged

  const busy = saving || deleting

  // form.formState.dirtyFields에 해당하는 값만 골라낸다 (바뀐 필드만 PATCH로 보낸다)
  function pickDirtyFields(values: UpdateOutput): UpdateOutput {
    const dirtyFields = form.formState.dirtyFields
    const result: UpdateOutput = {}
    ;(Object.keys(values) as UpdateFieldKey[]).forEach(key => {
      if (dirtyFields[key]) result[key] = values[key]
    })
    return result
  }

  // ApiError를 상태(필드 오류/404/그 외)에 맞게 반영한다
  function applySaveError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        toast.error('기록을 찾을 수 없습니다')
        router.push('/')
        return
      }
      if (error.fields) {
        let handled = false
        for (const [field, message] of Object.entries(error.fields)) {
          const photoKind = photoKinds.find(kind => field === `${kind}_photo`)
          if (photoKind) {
            photoCaptures[photoKind].setError(message)
            handled = true
          } else if (
            field === 'product_no' ||
            field === 'lot' ||
            field === 'memo'
          ) {
            form.setError(field, { message })
            handled = true
          }
        }
        if (handled) return
      }
    }
    // 그 밖의 오류: 입력값은 그대로 유지한다 (PRD §5 S-상세-4)
    toast.error('저장에 실패했습니다', {
      description: '입력한 내용은 그대로 남아 있습니다',
      action: {
        label: '다시 시도',
        onClick: () => void form.handleSubmit(handleSubmit)(),
      },
    })
  }

  async function handleSubmit(values: UpdateOutput) {
    setSaving(true)
    try {
      if (isPreview) {
        // 프리뷰(더미) 모드: PRD §5 S-상세-1·4 화면 상태만 재현한다
        await wait(800)
        if (preview === 'save-error') throw new Error('더미 저장 실패')
        form.reset(values)
        setReplaced([])
        setUpdatedAt(nowKstIso())
        toast.success('저장되었습니다')
        return
      }

      const fields = pickDirtyFields(values)
      const photosInput: Partial<Record<PhotoKind, File>> = {}
      for (const kind of photoKinds) {
        const file = photoCaptures[kind].file
        if (file) photosInput[kind] = file
      }

      if (onSave) {
        await onSave({ fields, photos: photosInput })
      } else {
        await updateRecord(record.id, {
          ...fields,
          barcode_photo: photosInput.barcode,
          product_photo: photosInput.product,
          lighting_photo: photosInput.lighting,
        })
      }
      form.reset(values)
      toast.success('저장되었습니다')
      // 새 사진·수정 시각을 기준 상태로 삼기 위해 서버 데이터를 다시 불러온다.
      // page.tsx가 record.updated_at을 key로 써서 새 데이터로 컴포넌트를 다시 마운트한다
      router.refresh()
    } catch (error) {
      if (isPreview) {
        toast.error('저장에 실패했습니다', {
          description: '입력한 내용은 그대로 남아 있습니다',
          action: {
            label: '다시 시도',
            onClick: () => void form.handleSubmit(handleSubmit)(),
          },
        })
      } else {
        applySaveError(error)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      if (onDelete) await onDelete()
      else if (isPreview) await wait(500)
      else await deleteRecord(record.id)
      toast.success('삭제되었습니다')
      router.push('/')
    } catch {
      setDeleting(false)
      toast.error('삭제에 실패했습니다')
    }
  }

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
          <dd>{formatKstDisplay(isPreview ? updatedAt : record.updated_at)}</dd>
        </dl>
        <RawTextBox rawText={record.raw_text} />
        <RecordFields disabled={busy} />
        {PHOTO_SLOTS.map(({ kind, label, hint }) =>
          isPreview ? (
            <PhotoSlot
              key={kind}
              label={label}
              hint={hint}
              state={photos[kind]}
              // 더미 재촬영: 같은 샘플 이미지로 교체
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
          ) : (
            <PhotoSlot
              key={kind}
              label={label}
              hint={hint}
              state={photoCaptures[kind].slot}
              // onFileSelected를 넘기므로 onCapture는 쓰이지 않는다
              onCapture={() => {}}
              onFileSelected={photoCaptures[kind].select}
              busy={photoCaptures[kind].busy}
              disabled={busy}
            />
          )
        )}
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
