import { CameraOff, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type CameraUnavailableReason = 'denied' | 'unsupported' | 'not-found'

interface CameraUnavailableProps {
  reason: CameraUnavailableReason
  onManualInput: () => void
}

const MESSAGES: Record<
  CameraUnavailableReason,
  { title: string; description: string }
> = {
  // PRD §5 S-스캔-1
  denied: {
    title: '카메라 권한이 필요합니다',
    description:
      '브라우저 설정에서 카메라 권한을 허용하거나, 제품 정보를 직접 입력해주세요',
  },
  // PRD §5 S-스캔-2 (비-HTTPS 포함). 흐름에서는 곧바로 직접 입력 화면으로 전환한다
  unsupported: {
    title: '이 브라우저에서는 카메라를 사용할 수 없습니다',
    description: '제품 정보를 직접 입력해주세요',
  },
  // 카메라 장치가 없거나(NotFoundError) 요청한 제약을 만족하는 장치가 없을 때(OverconstrainedError)
  'not-found': {
    title: '카메라를 찾을 수 없습니다',
    description: '사용 가능한 카메라가 없습니다. 제품 정보를 직접 입력해주세요',
  },
}

// 카메라 영역 대신 보여주는 안내 (권한 거부 / 미지원)
export function CameraUnavailable({
  reason,
  onManualInput,
}: CameraUnavailableProps) {
  const { title, description } = MESSAGES[reason]
  return (
    <div className="bg-muted flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-lg px-6 text-center">
      <div className="bg-background text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <CameraOff className="size-7" aria-hidden />
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
      <Button size="touch" className="mt-2 w-full" onClick={onManualInput}>
        <Keyboard />
        직접 입력
      </Button>
    </div>
  )
}
