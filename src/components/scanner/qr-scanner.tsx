'use client'

import { useEffect, useRef } from 'react'
import { playScanFeedback } from '@/lib/feedback'

// 카메라 시작 실패 사유. 권한 거부/보안 오류는 denied, 카메라 없음/제약 불가는 not-found,
// 그 외는 unknown으로 묶는다 (unknown은 denied 화면 문구를 재사용해도 된다)
export type QrScannerErrorReason = 'denied' | 'not-found' | 'unknown'

interface QrScannerProps {
  // 인식된 원문 텍스트. Product No/Lot 파싱은 상위(Task 016)에서 처리한다
  onDetected: (rawText: string) => void
  onError: (reason: QrScannerErrorReason) => void
}

// getUserMedia 오류의 name을 화면에 보여줄 사유로 변환한다
function toErrorReason(error: unknown): QrScannerErrorReason {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'not-found'
  }
  return 'unknown'
}

// @zxing/browser 기반 후면 카메라 실시간 스캐너.
// 이 컴포넌트는 next/dynamic(ssr:false)로만 불러오고, zxing 모듈도 effect 안에서
// 동적 import 해서 서버 렌더링 단계에서 브라우저 전용 API를 참조하지 않게 한다
export function QrScanner({ onDetected, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // 매 렌더마다 새로 생기는 콜백이라도 effect를 재시작하지 않도록 ref로 최신 값만 참조한다
  const onDetectedRef = useRef(onDetected)
  const onErrorRef = useRef(onError)
  onDetectedRef.current = onDetected
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false
    let detected = false
    let controls: { stop: () => void } | null = null

    async function start() {
      try {
        const [
          { BrowserMultiFormatReader },
          { BarcodeFormat, DecodeHintType },
        ] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])

        if (cancelled) return

        // 인식 대상 포맷 (ROADMAP Q14). 참고 라벨의 2D 코드가 Data Matrix라 반드시 포함한다
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.CODE_128,
          BarcodeFormat.EAN_13,
          BarcodeFormat.CODE_39,
        ])
        // TRY_HARDER는 1D 리더 순서가 밀리는 부작용이 있어 미적용.
        // 실기기 인식률·속도 측정 후 Task 022에서 적용 여부를 결정한다

        const reader = new BrowserMultiFormatReader(hints)

        const startedControls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current ?? undefined,
          (result, _error, frameControls) => {
            // 매 프레임 실패(NotFoundException 등)는 정상적인 노이즈라 무시하고,
            // 인식 성공(result)만 처리한다. 언마운트 뒤 도착한 콜백도 무시한다
            if (cancelled || detected || !result) return
            detected = true
            playScanFeedback()
            onDetectedRef.current(result.getText())
            frameControls.stop()
          }
        )

        if (cancelled) {
          // start 도중 언마운트됐으면 스트림만 정리하고 끝낸다
          startedControls.stop()
          return
        }
        controls = startedControls
      } catch (error) {
        if (cancelled) return
        onErrorRef.current(toErrorReason(error))
      }
    }

    void start()

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [])

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      autoPlay
      className="absolute inset-0 size-full object-cover"
    />
  )
}
