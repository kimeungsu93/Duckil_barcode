'use client'

import dynamic from 'next/dynamic'
import { Keyboard, ScanLine } from 'lucide-react'
import type { CameraStatus } from './scan-flow'
import { CameraUnavailable } from '@/components/scanner/camera-unavailable'
import type { QrScannerErrorReason } from '@/components/scanner/qr-scanner'
import { ScannerView } from '@/components/scanner/scanner-view'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { unlockAudio } from '@/lib/feedback'

// zxing은 브라우저 전용 API를 쓰므로 서버 렌더링 없이 클라이언트에서만 불러온다 (Task 014)
const QrScanner = dynamic(
  () => import('@/components/scanner/qr-scanner').then(mod => mod.QrScanner),
  { ssr: false }
)

interface ScannerStepProps {
  camera: CameraStatus
  // QR/바코드 인식 시 호출. Product No/Lot 파싱은 상위(Task 016)에서 처리한다
  onDetected: (rawText: string) => void
  // 카메라 시작 실패 시 호출 (권한 거부 등)
  onCameraError: (reason: QrScannerErrorReason) => void
  onManualInput: () => void
  // 개발 모드에서만 전달되는 더미 인식 원문 (카메라 없이 흐름 확인용)
  dummyRawText?: string
}

export function ScannerStep({
  camera,
  onDetected,
  onCameraError,
  onManualInput,
  dummyRawText,
}: ScannerStepProps) {
  // 카메라 지원 여부를 확인하는 동안에는 스캐너를 시도하지 않고 스켈레톤만 보여준다
  if (camera === 'checking') {
    return <Skeleton className="aspect-[3/4] w-full rounded-lg" />
  }

  if (
    camera === 'denied' ||
    camera === 'not-found' ||
    camera === 'unsupported'
  ) {
    return <CameraUnavailable reason={camera} onManualInput={onManualInput} />
  }

  function handleManualInput() {
    // 사용자 제스처 안에서 효과음을 미리 활성화해둔다 (PRD F1-2)
    unlockAudio()
    onManualInput()
  }

  return (
    <div className="flex flex-col gap-3">
      <ScannerView>
        <QrScanner onDetected={onDetected} onError={onCameraError} />
      </ScannerView>
      {dummyRawText && (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          onClick={() => onDetected(dummyRawText)}
        >
          <ScanLine />
          더미 QR 인식 (개발용)
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="touch"
        onClick={handleManualInput}
      >
        <Keyboard />
        직접 입력
      </Button>
    </div>
  )
}
