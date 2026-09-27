'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
import { createRecordSchema } from '@/lib/schemas/record'

// 생성 스키마를 그대로 쓰되, 직접 입력에서는 원문을 비워 둘 수 있게 한다.
// 비어 있으면 저장 시 MANUAL_RAW_TEXT로 바꾼다 (ROADMAP Q7)
const confirmSchema = createRecordSchema.extend({
  raw_text: createRecordSchema.shape.raw_text.or(z.literal('')),
})

type ConfirmInput = z.input<typeof confirmSchema>
type ConfirmOutput = z.output<typeof confirmSchema>

interface ConfirmStepProps {
  mode: 'camera' | 'manual'
  camera: CameraStatus
  rawText: string
  parseFailed: boolean
  defaultValues: ScanFields
  onConfirm: (fields: ScanFields) => void
  // 카메라 미지원이면 돌아갈 스캐너가 없어 undefined
  onBack?: () => void
}

export function ConfirmStep({
  mode,
  camera,
  rawText,
  parseFailed,
  defaultValues,
  onConfirm,
  onBack,
}: ConfirmStepProps) {
  const form = useForm<ConfirmInput, unknown, ConfirmOutput>({
    resolver: zodResolver(confirmSchema),
    defaultValues,
  })

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
        <RecordFields showRawTextInput={mode === 'manual'} />
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
