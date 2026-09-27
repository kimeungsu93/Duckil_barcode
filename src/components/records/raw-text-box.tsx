import { MANUAL_RAW_TEXT } from '@/lib/constants'

interface RawTextBoxProps {
  rawText: string
}

// QR 원문(raw_text) 읽기 전용 표시. 원문은 생성 후 변경하지 않는다 (PRD §4)
export function RawTextBox({ rawText }: RawTextBoxProps) {
  const isManual = rawText === MANUAL_RAW_TEXT
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">QR 원문</p>
      <div className="bg-muted max-h-40 overflow-y-auto rounded-md px-3 py-2">
        {isManual ? (
          <p className="text-muted-foreground text-sm">직접 입력(원문 없음)</p>
        ) : (
          <p className="font-mono text-sm break-all whitespace-pre-wrap">
            {rawText}
          </p>
        )}
      </div>
    </div>
  )
}
