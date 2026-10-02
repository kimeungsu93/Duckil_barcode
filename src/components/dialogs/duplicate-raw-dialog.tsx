'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatKstDisplay } from '@/lib/time'
import type { DuplicateRecordSummary } from '@/lib/types/record'

interface DuplicateRawDialogProps {
  // null이면 닫힌 상태
  existing: DuplicateRecordSummary | null
  onRescan: () => void
}

// 원본 바코드 중복 경고 (ROADMAP Phase 7 Task 025, PRD F4-6).
// existing.id가 0이면(서버가 기존 기록 정보를 주지 못한 경우) 요약·이동 버튼 없이 경고만 보여준다.
// 저장을 막고 기존 기록 보기 / 다시 스캔 중 하나를 고르게 한다
export function DuplicateRawDialog({
  existing,
  onRescan,
}: DuplicateRawDialogProps) {
  return (
    <AlertDialog
      open={existing !== null}
      onOpenChange={open => {
        if (!open) onRescan()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-5" aria-hidden />
            이미 등록된 바코드입니다
          </AlertDialogTitle>
          <AlertDialogDescription>
            같은 원본 바코드로 저장된 기록이 있어 저장할 수 없습니다
          </AlertDialogDescription>
        </AlertDialogHeader>
        {existing && existing.id > 0 && (
          <dl className="bg-muted grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md p-3 text-sm">
            <dt className="text-muted-foreground">Product No</dt>
            <dd className="font-medium break-all">{existing.product_no}</dd>
            <dt className="text-muted-foreground">Lot</dt>
            <dd className="font-medium break-all">{existing.lot}</dd>
            <dt className="text-muted-foreground">등록 일시</dt>
            <dd>{formatKstDisplay(existing.created_at)}</dd>
          </dl>
        )}
        <AlertDialogFooter>
          {existing && existing.id > 0 && (
            <Button asChild variant="outline" size="touch">
              <Link href={`/records/${existing.id}`}>기존 기록 보기</Link>
            </Button>
          )}
          <AlertDialogAction size="touch" onClick={onRescan}>
            다시 스캔
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
