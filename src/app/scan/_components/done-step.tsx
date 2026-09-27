import Link from 'next/link'
import { CheckCircle2, Home, ScanLine } from 'lucide-react'
import type { ScanFields } from './scan-flow'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface DoneStepProps {
  fields: ScanFields
  photoCount: number
  onNext: () => void
}

// 저장 완료 화면. 연속 작업을 위해 다음 스캔을 가장 먼저 둔다 (PRD §2-6)
export function DoneStep({ fields, photoCount, onNext }: DoneStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2
          className="size-12 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <p className="text-lg font-semibold">저장되었습니다</p>
      </div>
      <Card className="py-4">
        <CardContent className="px-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Product No</dt>
            <dd className="font-medium break-all">{fields.product_no}</dd>
            <dt className="text-muted-foreground">Lot</dt>
            <dd className="font-medium break-all">{fields.lot}</dd>
            <dt className="text-muted-foreground">사진</dt>
            <dd className="font-medium">{photoCount}장</dd>
            {fields.memo && (
              <>
                <dt className="text-muted-foreground">메모</dt>
                <dd className="break-all">{fields.memo}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-2">
        <Button type="button" size="touch" onClick={onNext}>
          <ScanLine />
          다음 스캔
        </Button>
        <Button asChild variant="outline" size="touch">
          <Link href="/">
            <Home />
            홈으로
          </Link>
        </Button>
      </div>
    </div>
  )
}
