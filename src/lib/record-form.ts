// 서버 전용 - POST/PATCH /api/records의 multipart FormData 공통 헬퍼 (Route Handler 전용)
import 'server-only'
import { apiError } from '@/lib/api-error'
import { checkPhotoFile } from '@/lib/schemas/photo'
import {
  deletePhoto,
  PhotoTooLargeError,
  savePhoto,
  UnsupportedMediaError,
} from '@/lib/storage'

const TEXT_FIELD_KEYS = ['raw_text', 'product_no', 'lot', 'memo'] as const
const PHOTO_FIELD_KEYS = ['barcode_photo', 'product_photo'] as const

// FormData에서 뽑아낸 텍스트 필드 (문자열 값만 담김, 존재하지 않으면 키 자체가 없음)
export type RecordFormFields = Partial<
  Record<(typeof TEXT_FIELD_KEYS)[number], string>
>

// FormData에서 뽑아낸 사진 파일 (File이고 size > 0일 때만 담김)
export type RecordFormPhotos = Partial<
  Record<(typeof PHOTO_FIELD_KEYS)[number], File>
>

export interface RecordFormData {
  fields: RecordFormFields
  photos: RecordFormPhotos
}

function isUsablePhotoFile(value: FormDataEntryValue | null): value is File {
  // 빈 파일 입력(브라우저가 값 없는 <input type="file">을 보낼 때 size=0)은 미전송으로 간주한다
  return value instanceof File && value.size > 0
}

// multipart FormData에서 텍스트 필드와 사진 파일을 분리해서 뽑아낸다.
// - 텍스트: 문자열 값만 채택 (File이 들어오면 해당 키는 무시)
// - 사진: File이고 size > 0일 때만 채택
export function readRecordForm(formData: FormData): RecordFormData {
  const fields: RecordFormFields = {}
  for (const key of TEXT_FIELD_KEYS) {
    const value = formData.get(key)
    if (typeof value === 'string') {
      fields[key] = value
    }
  }

  const photos: RecordFormPhotos = {}
  for (const key of PHOTO_FIELD_KEYS) {
    const value = formData.get(key)
    if (isUsablePhotoFile(value)) {
      photos[key] = value
    }
  }

  return { fields, photos }
}

export type PhotoPrecheckResult =
  | { ok: true }
  | { ok: false; code: 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' }

// 저장 전에 보내진 사진 전부(MIME·크기)를 먼저 검사한다. 하나라도 실패하면 ok:false를 반환하며,
// 호출 측은 이 결과를 확인한 뒤에만 savePhotos를 호출해야 한다 (아무 파일도 쓰기 전에 차단, PRD §4)
export function precheckPhotos(photos: RecordFormPhotos): PhotoPrecheckResult {
  for (const file of Object.values(photos)) {
    if (!file) continue
    const check = checkPhotoFile({ size: file.size, type: file.type })
    if (!check.ok) {
      return check
    }
  }
  return { ok: true }
}

// precheckPhotos 실패 결과를 413/415 응답으로 바꾼다
export function precheckErrorResponse(
  result: Extract<PhotoPrecheckResult, { ok: false }>
) {
  if (result.code === 'PAYLOAD_TOO_LARGE') {
    return apiError(413, 'PAYLOAD_TOO_LARGE', '사진 파일이 5MB를 초과했습니다')
  }
  return apiError(
    415,
    'UNSUPPORTED_MEDIA_TYPE',
    '지원하지 않는 이미지 형식입니다'
  )
}

// precheckPhotos를 통과한 파일명 키만 채워지는 저장 결과
export type SavedPhotos = Partial<
  Record<(typeof PHOTO_FIELD_KEYS)[number], string>
>

// 사진들을 하나씩 순서대로 저장한다. savePhoto는 매직 바이트까지 재검사하므로 precheck를 통과했어도
// 실패할 수 있다. 저장 도중 실패하면 이미 저장해둔 파일들을 모두 삭제한 뒤 에러를 다시 던진다
// (부분 저장 상태로 남기지 않는다)
export async function savePhotos(
  photos: RecordFormPhotos
): Promise<SavedPhotos> {
  const saved: SavedPhotos = {}
  try {
    for (const key of PHOTO_FIELD_KEYS) {
      const file = photos[key]
      if (!file) continue
      saved[key] = await savePhoto(file)
    }
    return saved
  } catch (error) {
    await rollbackSavedPhotos(saved)
    throw error
  }
}

// 저장된 파일명들을 전부 삭제한다 (롤백용). 파일이 이미 없어도 storage.ts가 조용히 흡수한다
export async function rollbackSavedPhotos(saved: SavedPhotos): Promise<void> {
  for (const name of Object.values(saved)) {
    if (name) await deletePhoto(name)
  }
}

// savePhotos/savePhoto가 던진 전용 에러를 413/415 응답으로 바꾼다.
// 매칭되지 않는 에러(예: 파일시스템 오류)면 null을 반환해 호출 측이 500 등으로 처리하게 한다
export function photoErrorResponse(error: unknown) {
  if (error instanceof PhotoTooLargeError) {
    return apiError(413, 'PAYLOAD_TOO_LARGE', error.message)
  }
  if (error instanceof UnsupportedMediaError) {
    return apiError(415, 'UNSUPPORTED_MEDIA_TYPE', error.message)
  }
  return null
}
