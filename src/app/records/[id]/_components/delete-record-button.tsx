'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog'
import { Button } from '@/components/ui/button'

interface DeleteRecordButtonProps {
  deleting: boolean
  onDelete: () => void
}

// 삭제 버튼 + 확인 모달 (PRD §5 S-상세-3)
export function DeleteRecordButton({
  deleting,
  onDelete,
}: DeleteRecordButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="touch"
        className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        disabled={deleting}
      >
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        {deleting ? '삭제 중...' : '기록 삭제'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="기록을 삭제하시겠습니까?"
        description="사진 파일도 함께 삭제되며 되돌릴 수 없습니다"
        confirmLabel="삭제"
        destructive
        onConfirm={onDelete}
      />
    </>
  )
}
