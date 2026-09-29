'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MEMO_MAX_LENGTH, RAW_TEXT_MAX_LENGTH } from '@/lib/constants'

// 스캔 확인·상세 수정 폼이 공유하는 필드. 키는 API DTO와 같은 snake_case
export interface RecordFieldsValues {
  product_no?: string
  lot?: string
  memo?: string
  raw_text?: string
}

interface RecordFieldsProps {
  // 직접 입력 모드에서만 "QR 원문(선택)" 입력란을 보여준다 (ROADMAP Q7)
  showRawTextInput?: boolean
  disabled?: boolean
  // QR 원문 입력란에서 포커스를 벗어났을 때 호출 (Task 016: parseQr로 자동 입력)
  onRawTextBlur?: () => void
}

// 상위 컴포넌트의 <Form>(FormProvider) 안에서 사용한다
export function RecordFields({
  showRawTextInput = false,
  disabled = false,
  onRawTextBlur,
}: RecordFieldsProps) {
  const { control } = useFormContext<RecordFieldsValues>()
  const memo = useWatch({ control, name: 'memo' }) ?? ''

  return (
    <div className="flex flex-col gap-4">
      {showRawTextInput && (
        <FormField
          control={control}
          name="raw_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>QR 원문(선택)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onBlur={() => {
                    field.onBlur()
                    onRawTextBlur?.()
                  }}
                  disabled={disabled}
                  maxLength={RAW_TEXT_MAX_LENGTH}
                  placeholder="라벨에 적힌 원문이 있으면 입력"
                  className="h-12 text-base"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={control}
        name="product_no"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product No</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                disabled={disabled}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="예: 84739-DC000(G2E)"
                className="h-12 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lot"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Lot</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                disabled={disabled}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="예: 2608200040"
                className="h-12 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="memo"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>메모(선택)</FormLabel>
              <span className="text-muted-foreground text-xs">
                {memo.length}/{MEMO_MAX_LENGTH}
              </span>
            </div>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ''}
                disabled={disabled}
                rows={3}
                className="min-h-24 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
