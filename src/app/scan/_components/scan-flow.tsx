'use client'

import { useReducer, useState } from 'react'
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
import {
  MOCK_PHOTO_URL,
  MOCK_RECORDS,
  type MockPhotoKind,
} from '@/lib/mock/records'

export type ScanPreview =
  | 'denied'
  | 'unsupported'
  | 'parse-fail'
  | 'photo-error'
  | 'save-error'
  | 'duplicate'
  | 'no-photo'

export type PhotoKind = MockPhotoKind
export type CameraStatus = 'ready' | 'denied' | 'unsupported'

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
  // Phase 2는 미리보기 URL, Task 016에서 리사이즈된 Blob으로 바뀐다
  photos: Record<PhotoKind, string | null>
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
  photos: Record<PhotoKind, PhotoSlotState>
  saving: boolean
  result: { fields: ScanFields; photoCount: number } | null
}

type ScanAction =
  | { type: 'DETECTED'; detection: ScanDetection }
  | { type: 'MANUAL' }
  | { type: 'CONFIRM'; fields: ScanFields }
  | { type: 'BACK' }
  | { type: 'SET_PHOTO'; kind: PhotoKind; state: PhotoSlotState }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_FAIL' }
  | { type: 'RESET' }

const EMPTY_FIELDS: ScanFields = {
  raw_text: '',
  product_no: '',
  lot: '',
  memo: '',
}
const EMPTY_PHOTOS: Record<PhotoKind, PhotoSlotState> = {
  barcode: { status: 'empty' },
  product: { status: 'empty' },
}

// 더미 사진 경로 (public/mock). 촬영 버튼을 누르면 이 이미지로 채운다
const DUMMY_PHOTO_URL: Record<PhotoKind, string> = MOCK_PHOTO_URL

// 더미 QR 인식 값. 참고 라벨 형식(P/NO는 정규화 결과 흉내, ROADMAP Q1·Q15).
// 더미 목록에 없는 lot이라 저장해도 중복이 아니다
const DUMMY_DETECTION: ScanDetection = {
  rawText: '2609290001 84739DC000G2E HW 1.00',
  parsed: { productNo: '84739-DC000(G2E)', lot: '2609290001' },
}
// 파싱 실패 미리보기용 원문 (규칙에 맞지 않는 형식)
const UNPARSED_RAW_TEXT = 'DUCKIL#20260928#A7F3-UNKNOWN-FORMAT'

// PRD §5 S-스캔-4 문구
export const PHOTO_DECODE_ERROR =
  '지원하지 않는 이미지 형식입니다. 다시 촬영해주세요'

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
    photos: EMPTY_PHOTOS,
    saving: false,
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
    const photos: Record<PhotoKind, PhotoSlotState> =
      preview === 'no-photo'
        ? EMPTY_PHOTOS
        : preview === 'photo-error'
          ? {
              barcode: { status: 'error', error: PHOTO_DECODE_ERROR },
              product: { status: 'preview', url: DUMMY_PHOTO_URL.product },
            }
          : {
              barcode: { status: 'preview', url: DUMMY_PHOTO_URL.barcode },
              product: { status: 'preview', url: DUMMY_PHOTO_URL.product },
            }
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
      photos,
    }
  }
  return freshState('ready')
}

function reducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'DETECTED': {
      const { rawText, parsed } = action.detection
      return {
        ...state,
        step: 'confirm',
        mode: 'camera',
        rawText,
        parseFailed: parsed === null,
        fields: {
          raw_text: rawText,
          product_no: parsed?.productNo ?? '',
          lot: parsed?.lot ?? '',
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
        fields: EMPTY_FIELDS,
      }
    case 'CONFIRM':
      return { ...state, step: 'photos', fields: action.fields }
    case 'BACK':
      if (state.step === 'photos') return { ...state, step: 'confirm' }
      if (state.step === 'confirm' && state.camera !== 'unsupported') {
        return { ...state, step: 'scanner' }
      }
      return state
    case 'SET_PHOTO':
      return {
        ...state,
        photos: { ...state.photos, [action.kind]: action.state },
      }
    case 'SAVE_START':
      return { ...state, saving: true }
    case 'SAVE_FAIL':
      // 입력값과 사진은 그대로 유지한다 (PRD §5 S-스캔-5)
      return { ...state, saving: false }
    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        step: 'done',
        result: {
          fields: state.fields,
          photoCount: Object.values(state.photos).filter(
            photo => photo.status === 'preview'
          ).length,
        },
      }
    case 'RESET':
      return freshState(state.camera)
  }
}

// 더미 저장: 0.8초 뒤 결과를 돌려준다. Task 016에서 POST /api/records 호출로 교체
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

const STEP_LABELS: Partial<Record<Step, { index: number; label: string }>> = {
  scanner: { index: 1, label: 'QR 스캔' },
  confirm: { index: 2, label: '정보 확인' },
  photos: { index: 3, label: '사진 촬영' },
}
const STEP_TOTAL = 3

interface ScanFlowProps {
  preview: ScanPreview | null
  // 저장 동작. 지정하지 않으면 더미 저장을 쓴다 (Task 016에서 API 연결)
  onSave?: (input: ScanSaveInput) => Promise<ScanSaveResult>
}

// 스캔 → 정보 확인 → 사진 2장 → 저장 완료 단계 흐름 컨테이너
export function ScanFlow({ preview, onSave }: ScanFlowProps) {
  const [state, dispatch] = useReducer(reducer, preview, initState)
  const [save] = useState(() => onSave ?? createDummySave(preview))
  const [noPhotoConfirmOpen, setNoPhotoConfirmOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const router = useRouter()

  // 정보 확인·사진 단계에서 나가면 입력값이 사라지므로 한 번 확인한다
  function handleLeave() {
    if (state.step === 'confirm' || state.step === 'photos') {
      setLeaveConfirmOpen(true)
      return
    }
    router.push('/')
  }

  async function runSave() {
    dispatch({ type: 'SAVE_START' })
    try {
      const result = await save({
        fields: state.fields,
        photos: {
          barcode:
            state.photos.barcode.status === 'preview'
              ? state.photos.barcode.url
              : null,
          product:
            state.photos.product.status === 'preview'
              ? state.photos.product.url
              : null,
        },
      })
      dispatch({ type: 'SAVE_SUCCESS' })
      toast.success('저장되었습니다')
      // 중복이어도 저장은 되고, 성공 토스트와 별도로 경고한다 (ROADMAP Q4)
      if (result.duplicate) toast.warning('중복 기록이 있습니다')
    } catch {
      dispatch({ type: 'SAVE_FAIL' })
      toast.error('저장에 실패했습니다', {
        description: '입력한 내용은 그대로 남아 있습니다',
        action: { label: '다시 시도', onClick: () => void runSave() },
      })
    }
  }

  function handleSave() {
    const missing = Object.values(state.photos).some(
      photo => photo.status !== 'preview'
    )
    // 사진은 선택 항목이라 확인만 받고 저장을 허용한다 (PRD §5 S-스캔-7)
    if (missing) {
      setNoPhotoConfirmOpen(true)
      return
    }
    void runSave()
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
                camera={state.camera}
                onDetected={detection =>
                  dispatch({ type: 'DETECTED', detection })
                }
                onManualInput={() => dispatch({ type: 'MANUAL' })}
                dummyDetection={
                  process.env.NODE_ENV === 'production'
                    ? undefined
                    : DUMMY_DETECTION
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
                photos={state.photos}
                saving={state.saving}
                onCapture={kind =>
                  dispatch({
                    type: 'SET_PHOTO',
                    kind,
                    state: { status: 'preview', url: DUMMY_PHOTO_URL[kind] },
                  })
                }
                onClear={kind =>
                  dispatch({
                    type: 'SET_PHOTO',
                    kind,
                    state: { status: 'empty' },
                  })
                }
                onSave={handleSave}
                onBack={() => dispatch({ type: 'BACK' })}
              />
            )}

            {state.step === 'done' && state.result && (
              <DoneStep
                fields={state.result.fields}
                photoCount={state.result.photoCount}
                onNext={() => dispatch({ type: 'RESET' })}
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
