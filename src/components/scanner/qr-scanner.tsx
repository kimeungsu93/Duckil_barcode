'use client'

import { useEffect, useRef } from 'react'
import type { ReaderOptions, readBarcodes } from 'zxing-wasm/reader'
import { playScanFeedback } from '@/lib/feedback'
import { aimRoiRect, fullFrameRect } from '@/lib/scan-roi'

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

// 작은 Data Matrix 인식을 위해 후면 카메라를 고해상도로 요청한다
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

// 디코딩 간격(ms). 이전 디코딩이 끝난 뒤에 다음을 예약하므로 프레임이 쌓이지 않는다
const DECODE_INTERVAL_MS = 120
// N번에 1번은 프레임 전체를 디코딩한다 (조준 사각형 밖에 코드가 있을 때 대비)
const FULL_FRAME_EVERY = 4
// wasm 준비가 이 시간 안에 끝나지 않으면 기존 zxing-js 경로로 넘어간다
const WASM_LOAD_TIMEOUT_MS = 10_000
// 지원 기기에서만 적용하는 초기 줌 배율 (작은 라벨을 가까이 대지 않아도 크게 보이게)
const PREFERRED_ZOOM = 1.5

// zxing-wasm 공통 옵션.
// - textMode Plain: 기본값(HRI)은 GS·RS 제어문자를 "␝" 같은 보이는 기호로 바꿔 파서가 깨진다
// - binarizer LocalAverage: 참고 라벨(비닐 반사) 실험에서 GlobalHistogram은 실패했다
const BASE_READER_OPTIONS: ReaderOptions = {
  formats: ['DataMatrix', 'QRCode', 'Code128', 'EAN13', 'Code39'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  textMode: 'Plain',
  binarizer: 'LocalAverage',
  maxNumberOfSymbols: 1,
}
// 잘라낸 조준 영역은 이미 작으므로 축소하지 않는다 (축소하면 작은 코드의 모듈이 뭉개진다)
const ROI_READER_OPTIONS: ReaderOptions = {
  ...BASE_READER_OPTIONS,
  tryDownscale: false,
}
// 프레임 전체는 기본 축소를 켜 둔다 (원본 4000x3000 실험에서 축소를 끄면 실패했다)
const FULL_FRAME_READER_OPTIONS: ReaderOptions = {
  ...BASE_READER_OPTIONS,
  tryDownscale: true,
}

type ReadBarcodes = typeof readBarcodes

// 디코더가 공통으로 쓰는 실행 상태
interface ScanContext {
  video: HTMLVideoElement
  // 언마운트·인식 완료 전까지만 true
  isActive: () => boolean
  // 인식 성공 시 1회 호출. 이미 처리된 경우 false를 반환한다
  onText: (text: string) => boolean
}

// lib.dom 타입에 아직 없는 카메라 제어 항목 (Android Chrome 등 일부 기기만 지원)
interface CameraCapabilities {
  focusMode?: string[]
  zoom?: { min: number; max: number }
}

// 사내망에서는 CDN에 접근할 수 없어 public/wasm/에서 직접 서빙하는 파일을 쓴다
// (scripts/copy-zxing-wasm.mjs가 node_modules에서 복사)
async function loadWasmReader(): Promise<ReadBarcodes> {
  const { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION } = await import(
    'zxing-wasm/reader'
  )

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('zxing-wasm 로딩 시간 초과')),
      WASM_LOAD_TIMEOUT_MS
    )
  })

  try {
    await Promise.race([
      prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) =>
            path.endsWith('.wasm')
              ? `/wasm/${path}?v=${ZXING_WASM_VERSION}`
              : prefix + path,
        },
        fireImmediately: true,
      }),
      timeout,
    ])
  } finally {
    clearTimeout(timeoutId)
  }

  return readBarcodes
}

// 연속 초점·줌은 지원하는 기기에서만 적용한다. iOS Safari·가짜 카메라 스트림은 건너뛰고 실패도 무시한다
async function tuneCamera(track: MediaStreamTrack | undefined) {
  if (!track || typeof track.getCapabilities !== 'function') return
  const capabilities = track.getCapabilities() as CameraCapabilities
  const advanced: Record<string, unknown> = {}

  if (capabilities.focusMode?.includes('continuous')) {
    advanced.focusMode = 'continuous'
  }
  if (capabilities.zoom) {
    const { min, max } = capabilities.zoom
    advanced.zoom = Math.min(max, Math.max(min, PREFERRED_ZOOM))
  }
  if (Object.keys(advanced).length === 0) return

  try {
    await track.applyConstraints({
      advanced: [advanced as MediaTrackConstraintSet],
    })
  } catch {
    // 지원 목록에 있어도 적용이 거부되는 기기가 있다. 기본 설정으로 계속 스캔한다
  }
}

// zxing-wasm(zxing-cpp) 기반 스캔. 조준 영역을 잘라 디코딩한다. 반환값은 정리 함수
async function startWasmScan(
  readBarcodes: ReadBarcodes,
  context: ScanContext
): Promise<() => void> {
  const { video, isActive, onText } = context
  const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS)
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = () => {
    clearTimeout(timer)
    stream.getTracks().forEach(track => track.stop())
    if (video.srcObject === stream) video.srcObject = null
  }

  if (!isActive()) {
    stop()
    return stop
  }

  await tuneCamera(stream.getVideoTracks()[0])
  video.srcObject = stream
  // autoPlay가 있어 재생 자체는 시작된다. 언마운트로 중단되면 play()가 거부되므로 무시한다
  await video.play().catch(() => {})

  const canvas = document.createElement('canvas')
  const canvasContext = canvas.getContext('2d', { willReadFrequently: true })
  if (!canvasContext) throw new Error('캔버스를 만들 수 없습니다')

  let tick = 0
  const decodeLoop = async () => {
    if (!isActive()) return

    const { videoWidth, videoHeight } = video
    if (video.readyState >= 2 && videoWidth > 0 && videoHeight > 0) {
      const isFullFrame = tick % FULL_FRAME_EVERY === 0
      tick++
      const rect = isFullFrame
        ? fullFrameRect(videoWidth, videoHeight)
        : aimRoiRect(
            videoWidth,
            videoHeight,
            video.clientWidth,
            video.clientHeight
          )

      canvas.width = rect.sw
      canvas.height = rect.sh
      canvasContext.drawImage(
        video,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        rect.sw,
        rect.sh
      )

      try {
        const results = await readBarcodes(
          canvasContext.getImageData(0, 0, rect.sw, rect.sh),
          isFullFrame ? FULL_FRAME_READER_OPTIONS : ROI_READER_OPTIONS
        )
        const hit = results.find(result => result.isValid && result.text)
        if (hit && onText(hit.text)) {
          stop()
          return
        }
      } catch (error) {
        // 프레임 하나의 디코딩 오류는 다음 프레임에서 다시 시도한다
        if (process.env.NODE_ENV === 'development') {
          console.debug('[qr-scanner] 디코딩 오류', error)
        }
      }
    }

    if (isActive()) timer = setTimeout(decodeLoop, DECODE_INTERVAL_MS)
  }

  void decodeLoop()
  return stop
}

// 기존 @zxing/browser(zxing-js) 기반 스캔. wasm을 불러오지 못했을 때만 쓰는 폴백이다.
// Data Matrix 인식률이 낮아(프레임 정중앙에서만 검출) 실기기 검증 후 제거 예정
async function startLegacyScan(context: ScanContext): Promise<() => void> {
  const { video, isActive, onText } = context
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import('@zxing/browser'), import('@zxing/library')])

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_39,
  ])
  // TRY_HARDER는 1D 리더 순서에만 영향이 있고 Data Matrix에는 효과가 없어 적용하지 않는다

  const reader = new BrowserMultiFormatReader(hints)
  const controls = await reader.decodeFromConstraints(
    CAMERA_CONSTRAINTS,
    video,
    (result, _error, frameControls) => {
      // 매 프레임 실패(NotFoundException 등)는 정상적인 노이즈라 무시하고,
      // 인식 성공(result)만 처리한다
      if (!isActive() || !result) return
      if (onText(result.getText())) frameControls.stop()
    }
  )
  return () => controls.stop()
}

// 후면 카메라 실시간 스캐너. zxing-wasm(zxing-cpp)을 우선 쓰고, 불러오지 못하면 zxing-js로 폴백한다.
// 이 컴포넌트는 next/dynamic(ssr:false)로만 불러오고, 디코더 모듈도 effect 안에서
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
    let stopScan: (() => void) | null = null

    const context: ScanContext | null = videoRef.current
      ? {
          video: videoRef.current,
          isActive: () => !cancelled && !detected,
          onText: text => {
            // 언마운트 뒤 도착한 결과와 두 번째 인식은 무시한다 (1회만 처리)
            if (cancelled || detected) return false
            detected = true
            playScanFeedback()
            onDetectedRef.current(text)
            return true
          },
        }
      : null

    async function start() {
      if (!context) return
      try {
        const readBarcodes = await loadWasmReader().catch(error => {
          console.warn(
            '[qr-scanner] zxing-wasm을 불러오지 못해 기본 디코더로 전환합니다',
            error
          )
          return null
        })
        if (cancelled) return

        const stop = readBarcodes
          ? await startWasmScan(readBarcodes, context)
          : await startLegacyScan(context)

        if (cancelled) {
          // start 도중 언마운트됐으면 스트림만 정리하고 끝낸다
          stop()
          return
        }
        stopScan = stop
      } catch (error) {
        if (cancelled) return
        onErrorRef.current(toErrorReason(error))
      }
    }

    void start()

    return () => {
      cancelled = true
      stopScan?.()
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
