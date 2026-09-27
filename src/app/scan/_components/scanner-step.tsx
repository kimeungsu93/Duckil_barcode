import { Keyboard, ScanLine } from 'lucide-react'
import type { CameraStatus, ScanDetection } from './scan-flow'
import { CameraUnavailable } from '@/components/scanner/camera-unavailable'
import { ScannerView } from '@/components/scanner/scanner-view'
import { Button } from '@/components/ui/button'

interface ScannerStepProps {
  camera: CameraStatus
  // QR 인식 시 호출. Task 014에서 실제 카메라 스캐너가 호출한다
  onDetected: (detection: ScanDetection) => void
  onManualInput: () => void
  // 개발 모드에서만 전달되는 더미 인식 값 (카메라 없이 흐름 확인용)
  dummyDetection?: ScanDetection
}

export function ScannerStep({
  camera,
  onDetected,
  onManualInput,
  dummyDetection,
}: ScannerStepProps) {
  if (camera === 'denied') {
    return <CameraUnavailable reason="denied" onManualInput={onManualInput} />
  }

  return (
    <div className="flex flex-col gap-3">
      <ScannerView />
      {dummyDetection && (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          onClick={() => onDetected(dummyDetection)}
        >
          <ScanLine />
          더미 QR 인식 (개발용)
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="touch"
        onClick={onManualInput}
      >
        <Keyboard />
        직접 입력
      </Button>
    </div>
  )
}
