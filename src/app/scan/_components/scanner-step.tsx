'use client'

import dynamic from 'next/dynamic'
import { Camera, Keyboard, ScanBarcode, ScanLine } from 'lucide-react'
import type { CameraStatus, ScanInput } from './scan-flow'
import { CameraUnavailable } from '@/components/scanner/camera-unavailable'
import type { QrScannerErrorReason } from '@/components/scanner/qr-scanner'
import { ScannerView } from '@/components/scanner/scanner-view'
import { WedgeScanInput } from '@/components/scanner/wedge-scan-input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { unlockAudio } from '@/lib/feedback'

// zxing은 브라우저 전용 API를 쓰므로 서버 렌더링 없이 클라이언트에서만 불러온다 (Task 014)
const QrScanner = dynamic(
  () => import('@/components/scanner/qr-scanner').then(mod => mod.QrScanner),
  { ssr: false }
)

interface ScannerStepProps {
  // 기본은 PDA 하드웨어 스캐너, 카메라는 대체 수단 (Phase 7 Task 024)
  input: ScanInput
  onInputChange: (input: ScanInput) => void
  camera: CameraStatus
  // 바코드 인식 시 호출. Product No/Lot 파싱은 상위(scan-flow)에서 처리한다
  onDetected: (rawText: string) => void
  // 카메라 시작 실패 시 호출 (권한 거부 등)
  onCameraError: (reason: QrScannerErrorReason) => void
  onManualInput: () => void
  // 중복 확인 중이면 PDA 입력을 잠시 막는다
  busy?: boolean
  // 개발 모드에서만 전달되는 더미 인식 원문 (스캐너 없이 흐름 확인용)
  dummyRawText?: string
}

export function ScannerStep({
  input,
  onInputChange,
  camera,
  onDetected,
  onCameraError,
  onManualInput,
  busy = false,
  dummyRawText,
}: ScannerStepProps) {
  function handleManualInput() {
    // 사용자 제스처 안에서 효과음을 미리 활성화해둔다 (PRD F1-2)
    unlockAudio()
    onManualInput()
  }

  function handleSwitch(next: ScanInput) {
    unlockAudio()
    onInputChange(next)
  }

  // 카메라 사용 불가 안내에는 자체 직접 입력 버튼이 있어 아래 버튼을 중복으로 두지 않는다
  const cameraUnavailable =
    input === 'camera' &&
    (camera === 'denied' || camera === 'not-found' || camera === 'unsupported')

  return (
    <div className="flex flex-col gap-3">
      {input === 'pda' ? (
        <WedgeScanInput onDetected={onDetected} disabled={busy} />
      ) : camera === 'checking' ? (
        // 카메라 지원 여부를 확인하는 동안에는 스캐너를 시도하지 않고 스켈레톤만 보여준다
        <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      ) : cameraUnavailable ? (
        <CameraUnavailable reason={camera} onManualInput={handleManualInput} />
      ) : (
        <ScannerView>
          <QrScanner onDetected={onDetected} onError={onCameraError} />
        </ScannerView>
      )}
      {dummyRawText && (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          onClick={() => onDetected(dummyRawText)}
          disabled={busy}
        >
          <ScanLine />
          더미 바코드 인식 (개발용)
        </Button>
      )}
      {input === 'pda' ? (
        // PDA 스캔이 안 될 때 기존 카메라 인식으로 전환한다 (PRD F1-7)
        <Button
          type="button"
          variant="outline"
          size="touch"
          onClick={() => handleSwitch('camera')}
        >
          <Camera />
          카메라로 스캔
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="touch"
          onClick={() => handleSwitch('pda')}
        >
          <ScanBarcode />
          PDA 스캔으로 돌아가기
        </Button>
      )}
      {!cameraUnavailable && (
        <Button
          type="button"
          variant="ghost"
          size="touch"
          onClick={handleManualInput}
        >
          <Keyboard />
          직접 입력
        </Button>
      )}
    </div>
  )
}
