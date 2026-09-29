'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AlertCircle, ArrowLeft, ArrowRight, Info } from 'lucide-react'
import { z } from 'zod'
import type { CameraStatus, ScanFields } from './scan-flow'
import { RawTextBox } from '@/components/records/raw-text-box'
import { RecordFields } from '@/components/records/record-fields'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { MANUAL_RAW_TEXT } from '@/lib/constants'
import { normalizeProductNo, parseQr } from '@/lib/qr-parser'
import { createRecordSchema } from '@/lib/schemas/record'

// 생성 스키마를 그대로 쓰되, 직접 입력에서는 원문을 비워 둘 수 있게 한다.
// 비어 있으면 저장 시 MANUAL_RAW_TEXT로 바꾼다 (ROADMAP Q7)
const confirmSchema = createRecordSchema.extend({
  raw_text: createRecordSchema.shape.raw_text.or(z.literal('')),
})

type ConfirmInput = z.input<typeof confirmSchema>
type ConfirmOutput = z.output<typeof confirmSchema>

// 서버 검증 실패(400 VALIDATION_ERROR)가 표시할 수 있는 필드만 좁힌다
const SERVER_ERROR_FIELDS = ['raw_text', 'product_no', 'lot', 'memo'] as const

interface ConfirmStepProps {
  mode: 'camera' | 'manual'
  camera: CameraStatus
  rawText: string
  parseFailed: boolean
  defaultValues: ScanFields
  onConfirm: (fields: ScanFields) => void
  // 카메라 미지원이면 돌아갈 스캐너가 없어 undefined
  onBack?: () => void
  // 저장 시 400 VALIDATION_ERROR로 돌아온 필드별 오류 메시지 (Task 016)
  serverErrors?: Record<string, string> | null
}

export function ConfirmStep({
  mode,
  camera,
  rawText,
  parseFailed,
  defaultValues,
  onConfirm,
  onBack,
  serverErrors,
}: ConfirmStepProps) {
  const form = useForm<ConfirmInput, unknown, ConfirmOutput>({
    resolver: zodResolver(confirmSchema),
    defaultValues,
  })

  // 저장 실패로 이 화면에 돌아왔을 때 서버가 알려준 필드 오류를 표시한다
  useEffect(() => {
    if (!serverErrors) return
    for (const key of SERVER_ERROR_FIELDS) {
      const message = serverErrors[key]
      if (message) {
        form.setError(key, { type: 'server', message })
      }
    }
  }, [serverErrors, form])

  // 직접 입력한 QR 원문에서 포커스가 벗어나면 파싱을 시도해, 사용자가 아직 손대지 않은
  // 빈 필드만 자동으로 채운다 (Product No는 정규화까지 적용, ROADMAP Q1·Q15)
  function handleRawTextBlur() {
    const raw = form.getValues('raw_text') ?? ''
    const result = parseQr(raw)
    if (!result.productNo || !result.lot) return

    const dirty = form.formState.dirtyFields
    if (!dirty.product_no && !form.getValues('product_no')) {
      form.setValue('product_no', normalizeProductNo(result.productNo), {
        shouldValidate: true,
      })
    }
    if (!dirty.lot && !form.getValues('lot')) {
      form.setValue('lot', result.lot, { shouldValidate: true })
    }
  }

  function handleSubmit(values: ConfirmOutput) {
    onConfirm({
      raw_text: values.raw_text || MANUAL_RAW_TEXT,
      product_no: values.product_no,
      lot: values.lot,
      memo: values.memo ?? '',
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {camera === 'unsupported' && (
          <Alert>
            <Info />
            <AlertTitle>
              이 브라우저에서는 카메라를 사용할 수 없습니다
            </AlertTitle>
            <AlertDescription>
              제품 정보를 직접 입력해주세요. 카메라는 HTTPS 주소에서만 사용할 수
              있습니다.
            </AlertDescription>
          </Alert>
        )}
        {parseFailed && (
          // PRD §5 S-스캔-3
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>자동 인식 실패, 직접 입력해주세요</AlertTitle>
          </Alert>
        )}
        {mode === 'camera' && <RawTextBox rawText={rawText} />}
        <RecordFields
          showRawTextInput={mode === 'manual'}
          onRawTextBlur={mode === 'manual' ? handleRawTextBlur : undefined}
        />
        <div className="flex flex-col gap-2">
          <Button type="submit" size="touch">
            다음
            <ArrowRight />
          </Button>
          {onBack && (
            <Button type="button" variant="ghost" size="touch" onClick={onBack}>
              <ArrowLeft />
              다시 스캔
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
