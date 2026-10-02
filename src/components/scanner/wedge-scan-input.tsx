'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ScanBarcode } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { playScanFeedback } from '@/lib/feedback'
import { normalizeWedgeText } from '@/lib/wedge-input'

interface WedgeScanInputProps {
  // 스캔 1회가 끝나면(Enter) 정리된 원문으로 호출한다
  onDetected: (rawText: string) => void
  // 중복 확인 등 처리 중이면 입력을 막는다
  disabled?: boolean
}

// 열려 있는 모달이 있으면 포커스를 빼앗지 않는다 (Radix Dialog·AlertDialog)
function isDialogOpen(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"], [role="alertdialog"]')
  )
}

// PDA 하드웨어 스캐너(키보드 웨지) 입력란 (ROADMAP Phase 7 Task 024, PRD F1-6).
// 스캐너는 포커스된 입력란에 문자를 키보드처럼 넣고 끝에 Enter를 보낸다
export function WedgeScanInput({
  onDetected,
  disabled = false,
}: WedgeScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const rawText = normalizeWedgeText(value)
    setValue('')
    if (!rawText.trim()) return
    playScanFeedback()
    onDetected(rawText)
  }

  // 화면 빈 곳을 눌러 포커스가 body로 빠지면 다시 입력란으로 돌려 다음 스캔을 받을 수 있게 한다.
  // 다른 버튼·입력으로 옮겨간 경우(relatedTarget 있음)는 그대로 둔다
  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (event.relatedTarget) return
    window.setTimeout(() => {
      if (disabled || isDialogOpen()) return
      if (document.activeElement === document.body) {
        inputRef.current?.focus()
      }
    }, 0)
  }

  return (
    <div className="bg-muted flex w-full flex-col items-center gap-4 rounded-lg px-6 py-10 text-center">
      <div className="bg-background text-primary flex size-16 items-center justify-center rounded-full">
        <ScanBarcode className="size-8" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">PDA 스캔 버튼을 눌러주세요</p>
        <p className="text-muted-foreground text-sm">
          라벨의 바코드를 읽으면 다음 단계로 넘어갑니다
        </p>
      </div>
      <Input
        ref={inputRef}
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        // 하드웨어 스캐너 입력이라 소프트 키보드를 띄우지 않는다
        inputMode="none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label="PDA 스캔 입력"
        placeholder="스캔 대기 중..."
        className="bg-background h-12 text-center"
      />
    </div>
  )
}
