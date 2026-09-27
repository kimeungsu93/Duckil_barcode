// 클라이언트·서버 공용 - 서버 전용 코드(next/server, fs 등) import 금지
import { z } from 'zod'
import {
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_BYTES,
  type PhotoMimeType,
} from '@/lib/constants'

// uuid v4 소문자 + .jpg (PRD §4). 경로 조작 방지를 위해 파일시스템 접근 전에 검사한다
export const PHOTO_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/

export const photoFilenameSchema = z
  .string()
  .regex(PHOTO_FILENAME_PATTERN, { error: '잘못된 파일명입니다' })

export type PhotoCheckResult =
  | { ok: true }
  | { ok: false; code: 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' }

// 업로드 파일의 MIME·크기 검사. 413/415를 구분해야 해서 Zod 대신 순수 함수로 둔다.
// 매직 바이트 검사는 서버 저장 단계(Task 010)에서 따로 한다 (ROADMAP Q8)
export function checkPhotoFile(file: {
  size: number
  type: string
}): PhotoCheckResult {
  if (!PHOTO_ALLOWED_TYPES.includes(file.type as PhotoMimeType)) {
    return { ok: false, code: 'UNSUPPORTED_MEDIA_TYPE' }
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, code: 'PAYLOAD_TOO_LARGE' }
  }
  return { ok: true }
}
