'use client'

import { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ConfirmStep } from './confirm-step'
import { DoneStep } from './done-step'
import { PhotoStep } from './photo-step'
import { ScannerStep } from './scanner-step'
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import type { PhotoSlotState } from '@/components/records/photo-slot'
import { usePhotoCapture } from '@/components/records/use-photo-capture'
import type { QrScannerErrorReason } from '@/components/scanner/qr-scanner'
import { ApiError, createRecord } from '@/lib/api/records-client'
import { isCameraSupported } from '@/lib/camera-support'
import { PHOTO_DECODE_ERROR } from '@/lib/constants'
import { unlockAudio } from '@/lib/feedback'
import {
  MOCK_PHOTO_URL,
  MOCK_RECORDS,
  type MockPhotoKind,
} from '@/lib/mock/records'
import { normalizeProductNo, parseQr } from '@/lib/qr-parser'

export type ScanPreview =
  | 'denied'
  | 'unsupported'
  | 'parse-fail'
  | 'photo-error'
  | 'save-error'
  | 'duplicate'
  | 'no-photo'

export type PhotoKind = MockPhotoKind
// checking: 카메라 지원 여부 확인 중 (마운트 effect가 ready/unsupported로 바꾼다)
export type CameraStatus =
  | 'checking'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'not-found'

// 정보 확인 단계에서 확정한 값. 키는 API DTO와 같은 snake_case
export interface ScanFields {
  raw_text: string
  product_no: string
  lot: string
  memo: string
}

// QR 인식 결과. 파싱에 실패하면 parsed가 null (PRD §3 F2)
export interface ScanDetection {
  rawText: string
  parsed: { productNo: string; lot: string } | null
}

export interface ScanSaveInput {
  fields: ScanFields
  // 리사이즈된 사진 파일 (usePhotoCapture 결과, 없으면 null)
  photos: Record<PhotoKind, File | null>
}

export interface ScanSaveResult {
  duplicate: boolean
}

type Step = 'scanner' | 'confirm' | 'photos' | 'done'

interface ScanState {
  step: Step
  camera: CameraStatus
  mode: 'camera' | 'manual'
  rawText: string
  parseFailed: boolean
  fields: ScanFields
  saving: boolean
  // 저장 시 400 VALIDATION_ERROR로 돌아온 필드별 오류 (confirm 단계로 되돌아가 표시)
  serverErrors: Record<string, string> | null
  result: { fields: ScanFields; photoCount: number } | null
}

type ScanAction =
  | { type: 'DETECTED'; rawText: string }
  | { type: 'MANUAL' }
  | { type: 'CONFIRM'; fields: ScanFields }
  | { type: 'BACK' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; photoCount: number }
  | { type: 'SAVE_FAIL' }
  | { type: 'SAVE_VALIDATION_ERROR'; fields: Record<string, string> }
  | { type: 'CAMERA_READY' }
  | { type: 'CAMERA_UNSUPPORTED' }
  | { type: 'CAMERA_ERROR'; reason: QrScannerErrorReason }
  | { type: 'RESET' }

const EMPTY_FIELDS: ScanFields = {
  raw_text: '',
  product_no: '',
  lot: '',
  memo: '',
}

// 더미 사진 경로 (public/mock). preview 모드에서 사진 상태를 흉내낼 때만 쓴다
const DUMMY_PHOTO_URL: Record<PhotoKind, string> = MOCK_PHOTO_URL

// 더미 QR 인식 값. key-value 규칙으로 파싱되게 해서 자동 입력·정규화 동작을 그대로 보여준다
// (ROADMAP Q1·Q15). 더미 목록(MOCK_RECORDS)에 없는 lot이라 저장해도 중복이 아니다
const DUMMY_RAW_TEXT = 'PN:84739DC000G2E;LOT:2609290001'

function buildDummyDetection(): ScanDetection {
  const parsed = parseQr(DUMMY_RAW_TEXT)
  if (!parsed.productNo || !parsed.lot) {
    return { rawText: DUMMY_RAW_TEXT, parsed: null }
  }
  return {
    rawText: DUMMY_RAW_TEXT,
    parsed: {
      productNo: normalizeProductNo(parsed.productNo),
      lot: parsed.lot,
    },
  }
}
const DUMMY_DETECTION: ScanDetection = buildDummyDetection()

// 파싱 실패 미리보기용 원문 (규칙에 맞지 않는 형식)
const UNPARSED_RAW_TEXT = 'DUCKIL#20260928#A7F3-UNKNOWN-FORMAT'

function freshState(camera: CameraStatus): ScanState {
  // 카메라 미지원이면 스캐너 없이 직접 입력 화면으로 바로 시작 (PRD §5 S-스캔-2)
  const manual = camera === 'unsupported'
  return {
    step: manual ? 'confirm' : 'scanner',
    camera,
    mode: manual ? 'manual' : 'camera',
    rawText: '',
    parseFailed: false,
    fields: EMPTY_FIELDS,
    saving: false,
    serverErrors: null,
    result: null,
  }
}

// ?preview 값에 맞춰 해당 상태가 보이는 단계에서 시작한다 (개발 모드 전용)
function initState(preview: ScanPreview | null): ScanState {
  if (preview === 'denied') return freshState('denied')
  if (preview === 'unsupported') return freshState('unsupported')
  if (preview === 'parse-fail') {
    return {
      ...freshState('ready'),
      step: 'confirm',
      rawText: UNPARSED_RAW_TEXT,
      parseFailed: true,
      fields: { ...EMPTY_FIELDS, raw_text: UNPARSED_RAW_TEXT },
    }
  }
  if (preview) {
    // 중복 미리보기는 더미 목록에 이미 있는 값으로 채운다
    const base = preview === 'duplicate' ? MOCK_RECORDS[0] : null
    const fields: ScanFields = base
      ? {
          raw_text: base.raw_text,
          product_no: base.product_no,
          lot: base.lot,
          memo: '',
        }
      : {
          raw_text: DUMMY_DETECTION.rawText,
          product_no: DUMMY_DETECTION.parsed?.productNo ?? '',
          lot: DUMMY_DETECTION.parsed?.lot ?? '',
          memo: '',
        }
    return {
      ...freshState('ready'),
      step: 'photos',
      rawText: fields.raw_text,
      fields,
    }
  }
  // 미리보기가 없으면 마운트 effect가 카메라 지원 여부를 확인할 때까지 checking 상태로 시작한다.
  // 서버·클라이언트 첫 렌더가 항상 같아야 하므로 여기서 브라우저 API를 참조하지 않는다
  return freshState('checking')
}

// preview 모드에서 사진 슬롯이 보여야 할 더미 상태 (실제 파일은 없고 화면 표시 전용, Task 016).
// 사용자가 슬롯을 건드리면(파일 선택·비우기) scan-flow가 해당 kind의 override를 지워
// usePhotoCapture의 실제 상태로 넘어간다
function previewPhotoOverride(
  preview: ScanPreview | null
): Record<PhotoKind, PhotoSlotState | null> {
  if (preview === 'photo-error') {
    return {
      barcode: { status: 'error', error: PHOTO_DECODE_ERROR },
      product: { status: 'preview', url: DUMMY_PHOTO_URL.product },
    }
  }
  if (preview === 'save-error' || preview === 'duplicate') {
    return {
      barcode: { status: 'preview', url: DUMMY_PHOTO_URL.barcode },
      product: { status: 'preview', url: DUMMY_PHOTO_URL.product },
    }
  }
  return { barcode: null, product: null }
}

function reducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'DETECTED': {
      const { rawText } = action
      const parsed = parseQr(rawText)
      const success = Boolean(parsed.productNo && parsed.lot)
      return {
        ...state,
        step: 'confirm',
        mode: 'camera',
        rawText,
        parseFailed: !success,
        serverErrors: null,
        fields: {
          raw_text: rawText,
          product_no: success ? normalizeProductNo(parsed.productNo!) : '',
          lot: success ? parsed.lot! : '',
          memo: '',
        },
      }
    }
    case 'MANUAL':
      return {
        ...state,
        step: 'confirm',
        mode: 'manual',
        rawText: '',
        parseFailed: false,
        serverErrors: null,
        fields: EMPTY_FIELDS,
      }
    case 'CONFIRM':
      return {
        ...state,
        step: 'photos',
        fields: action.fields,
        serverErrors: null,
      }
    case 'BACK':
      if (state.step === 'photos') return { ...state, step: 'confirm' }
      if (state.step === 'confirm' && state.camera !== 'unsupported') {
        return { ...state, step: 'scanner' }
      }
      return state
    case 'SAVE_START':
      return { ...state, saving: true }
    case 'SAVE_FAIL':
      // 입력값과 사진은 그대로 유지한다 (PRD §5 S-스캔-5)
      return { ...state, saving: false }
    case 'SAVE_VALIDATION_ERROR':
      // 서버가 알려준 필드 오류를 보여주기 위해 확인 단계로 되돌아간다
      return {
        ...state,
        saving: false,
        step: 'confirm',
        serverErrors: action.fields,
      }
    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        step: 'done',
        result: { fields: state.fields, photoCount: action.photoCount },
      }
    case 'CAMERA_READY':
      return { ...state, camera: 'ready' }
    case 'CAMERA_UNSUPPORTED':
      // 미지원이면 카메라 없이 바로 직접 입력 화면으로 전환한다 (PRD §5 S-스캔-2)
      return { ...freshState('unsupported') }
    case 'CAMERA_ERROR': {
      // unknown 사유는 denied 화면 문구를 재사용한다
      const camera: CameraStatus =
        action.reason === 'unknown' ? 'denied' : action.reason
      return { ...state, camera }
    }
    case 'RESET':
      return freshState(state.camera === 'checking' ? 'ready' : state.camera)
  }
}

// 더미 저장: 0.8초 뒤 결과를 돌려준다 (preview 모드 전용, S-코드 확인용)
function createDummySave(preview: ScanPreview | null) {
  return async ({ fields }: ScanSaveInput): Promise<ScanSaveResult> => {
    await new Promise(resolve => setTimeout(resolve, 800))
    if (preview === 'save-error') throw new Error('더미 저장 실패')
    // 중복 판정: trim 후 대소문자까지 일치 (ROADMAP Q9)
    const duplicate = MOCK_RECORDS.some(
      record =>
        record.product_no === fields.product_no.trim() &&
        record.lot === fields.lot.trim()
    )
    return { duplicate }
  }
}

// 실제 저장: POST /api/records 호출 (Task 016)
async function saveViaApi({
  fields,
  photos,
}: ScanSaveInput): Promise<ScanSaveResult> {
  const response = await createRecord({
    raw_text: fields.raw_text,
    product_no: fields.product_no,
    lot: fields.lot,
    memo: fields.memo || undefined,
    barcode_photo: photos.barcode ?? undefined,
    product_photo: photos.product ?? undefined,
  })
  return { duplicate: response.duplicate }
}

const STEP_LABELS: Partial<Record<Step, { index: number; label: string }>> = {
  scanner: { index: 1, label: 'QR 스캔' },
  confirm: { index: 2, label: '정보 확인' },
  photos: { index: 3, label: '사진 촬영' },
}
const STEP_TOTAL = 3

interface ScanFlowProps {
  preview: ScanPreview | null
  // 저장 동작. 지정하지 않으면 preview 여부에 따라 더미 저장 또는 실제 API 저장을 쓴다
  onSave?: (input: ScanSaveInput) => Promise<ScanSaveResult>
}

// 스캔 → 정보 확인 → 사진 2장 → 저장 완료 단계 흐름 컨테이너
export function ScanFlow({ preview, onSave }: ScanFlowProps) {
  const [state, dispatch] = useReducer(reducer, preview, initState)
  const barcodePhoto = usePhotoCapture()
  const productPhoto = usePhotoCapture()
  // preview 모드 전용 더미 사진 표시. 사용자가 슬롯을 건드리면 해당 kind만 null로 지워
  // 실제 usePhotoCapture 상태가 보이게 한다
  const [previewOverride, setPreviewOverride] = useState<
    Record<PhotoKind, PhotoSlotState | null>
  >(() => previewPhotoOverride(preview))
  const [save] = useState(
    () => onSave ?? (preview ? createDummySave(preview) : saveViaApi)
  )
  const [noPhotoConfirmOpen, setNoPhotoConfirmOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  // 다음 스캔 시작 시 값을 올려 스캐너를 강제로 다시 마운트한다 (카메라 재시작)
  const [scannerKey, setScannerKey] = useState(0)
  const router = useRouter()

  // 마운트 후 실제 카메라 지원 여부를 확인해 checking 상태를 ready/unsupported로 바꾼다.
  // 미리보기(?preview) 모드는 이미 최종 카메라 상태로 시작하므로 건드리지 않는다
  useEffect(() => {
    if (preview) return
    if (isCameraSupported()) {
      dispatch({ type: 'CAMERA_READY' })
    } else {
      dispatch({ type: 'CAMERA_UNSUPPORTED' })
    }
  }, [preview])

  // 정보 확인·사진 단계에서 나가면 입력값이 사라지므로 한 번 확인한다
  function handleLeave() {
    if (state.step === 'confirm' || state.step === 'photos') {
      setLeaveConfirmOpen(true)
      return
    }
    router.push('/')
  }

  const photoCaptures = { barcode: barcodePhoto, product: productPhoto }

  function handleFileSelected(kind: PhotoKind, file: File) {
    setPreviewOverride(prev => ({ ...prev, [kind]: null }))
    void photoCaptures[kind].select(file)
  }

  function handleClearPhoto(kind: PhotoKind) {
    setPreviewOverride(prev => ({ ...prev, [kind]: null }))
    photoCaptures[kind].clear()
  }

  // 화면에 사진이 보이는지 여부. preview 모드에서 더미 사진이 표시 중(previewOverride가
  // 'preview')이면 실제 파일이 없어도 있는 것으로 본다. 사용자가 슬롯을 건드려
  // override가 지워지면 실제 파일 기준으로 되돌아간다
  function hasPhoto(kind: PhotoKind): boolean {
    const override = previewOverride[kind]
    return override ? override.status === 'preview' : !!photoCaptures[kind].file
  }

  async function runSave() {
    dispatch({ type: 'SAVE_START' })
    try {
      const result = await save({
        fields: state.fields,
        photos: { barcode: barcodePhoto.file, product: productPhoto.file },
      })
      const photoCount = [hasPhoto('barcode'), hasPhoto('product')].filter(
        Boolean
      ).length
      dispatch({ type: 'SAVE_SUCCESS', photoCount })
      toast.success('저장되었습니다')
      // 중복이어도 저장은 되고, 성공 토스트와 별도로 경고한다 (ROADMAP Q4)
      if (result.duplicate) toast.warning('중복 기록이 있습니다')
    } catch (error) {
      if (error instanceof ApiError) {
        // 400 VALIDATION_ERROR: 확인 단계로 돌아가 필드 오류를 표시한다
        if (error.code === 'VALIDATION_ERROR' && error.fields) {
          dispatch({ type: 'SAVE_VALIDATION_ERROR', fields: error.fields })
          toast.error('입력값을 확인해주세요')
          return
        }
        // 413/415: 문제가 된 사진 슬롯에 오류를 표시한다
        if (
          (error.code === 'PAYLOAD_TOO_LARGE' ||
            error.code === 'UNSUPPORTED_MEDIA_TYPE') &&
          error.fields
        ) {
          dispatch({ type: 'SAVE_FAIL' })
          if (error.fields.barcode_photo) {
            barcodePhoto.setError(error.fields.barcode_photo)
          }
          if (error.fields.product_photo) {
            productPhoto.setError(error.fields.product_photo)
          }
          toast.error(error.message)
          return
        }
      }
      // 그 외 오류·네트워크 오류: 입력값과 사진은 그대로 두고 다시 시도를 안내한다
      dispatch({ type: 'SAVE_FAIL' })
      toast.error('저장에 실패했습니다', {
        description: '입력한 내용은 그대로 남아 있습니다',
        action: { label: '다시 시도', onClick: () => void runSave() },
      })
    }
  }

  function handleSave() {
    // 사진 누락 여부는 화면에 보이는 슬롯 상태 기준으로 판단한다 (preview 모드 회귀 수정)
    const missing = !hasPhoto('barcode') || !hasPhoto('product')
    // 사진은 선택 항목이라 확인만 받고 저장을 허용한다 (PRD §5 S-스캔-7)
    if (missing) {
      setNoPhotoConfirmOpen(true)
      return
    }
    void runSave()
  }

  function handleNextScan() {
    dispatch({ type: 'RESET' })
    barcodePhoto.reset()
    productPhoto.reset()
    setPreviewOverride({ barcode: null, product: null })
    unlockAudio()
    setScannerKey(key => key + 1)
  }

  const stepInfo = STEP_LABELS[state.step]

  return (
    <>
      <AppHeader title="스캔" onBack={handleLeave} />
      <main className="flex-1">
        <Container
          size="mobile"
          className="py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex flex-col gap-4">
            {stepInfo && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{stepInfo.label}</p>
                <p
                  className="text-muted-foreground text-sm"
                  aria-label={`${STEP_TOTAL}단계 중 ${stepInfo.index}단계`}
                >
                  {stepInfo.index}/{STEP_TOTAL}
                </p>
              </div>
            )}

            {state.step === 'scanner' && (
              <ScannerStep
                key={scannerKey}
                camera={state.camera}
                onDetected={rawText => dispatch({ type: 'DETECTED', rawText })}
                onCameraError={reason =>
                  dispatch({ type: 'CAMERA_ERROR', reason })
                }
                onManualInput={() => dispatch({ type: 'MANUAL' })}
                dummyRawText={
                  process.env.NODE_ENV === 'production'
                    ? undefined
                    : DUMMY_DETECTION.rawText
                }
              />
            )}

            {state.step === 'confirm' && (
              <ConfirmStep
                mode={state.mode}
                camera={state.camera}
                rawText={state.rawText}
                parseFailed={state.parseFailed}
                defaultValues={state.fields}
                serverErrors={state.serverErrors}
                onConfirm={fields => dispatch({ type: 'CONFIRM', fields })}
                onBack={
                  state.camera === 'unsupported'
                    ? undefined
                    : () => dispatch({ type: 'BACK' })
                }
              />
            )}

            {state.step === 'photos' && (
              <PhotoStep
                photos={{
                  barcode: previewOverride.barcode ?? barcodePhoto.slot,
                  product: previewOverride.product ?? productPhoto.slot,
                }}
                busy={{
                  barcode: barcodePhoto.busy,
                  product: productPhoto.busy,
                }}
                saving={state.saving}
                onFileSelected={handleFileSelected}
                onClear={handleClearPhoto}
                onSave={handleSave}
                onBack={() => dispatch({ type: 'BACK' })}
              />
            )}

            {state.step === 'done' && state.result && (
              <DoneStep
                fields={state.result.fields}
                photoCount={state.result.photoCount}
                onNext={handleNextScan}
              />
            )}

            <ConfirmDialog
              open={noPhotoConfirmOpen}
              onOpenChange={setNoPhotoConfirmOpen}
              title="사진 없이 저장하시겠습니까?"
              description="비어 있는 사진은 나중에 상세 화면에서 추가할 수 있습니다"
              confirmLabel="저장"
              onConfirm={() => void runSave()}
            />
            <ConfirmDialog
              open={leaveConfirmOpen}
              onOpenChange={setLeaveConfirmOpen}
              title="스캔을 그만두시겠습니까?"
              description="입력한 내용과 사진은 저장되지 않습니다"
              confirmLabel="그만두기"
              cancelLabel="계속 입력"
              destructive
              onConfirm={() => router.push('/')}
            />
          </div>
        </Container>
      </main>
    </>
  )
}
