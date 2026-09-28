// 서버 전용 - 사진 파일 저장소 유틸 (node:fs, node:path 사용). 클라이언트 컴포넌트에서 import 금지
// import 시점에는 파일시스템에 접근하지 않는다 (next build 시 data/ 생성 방지, ROADMAP Q2)
import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_DIR } from '@/lib/env'
import { checkPhotoFile, PHOTO_FILENAME_PATTERN } from '@/lib/schemas/photo'

// 사진이 5MB 상한을 초과했을 때 (API가 413으로 변환)
export class PhotoTooLargeError extends Error {
  constructor() {
    super('사진 파일이 5MB를 초과했습니다')
    this.name = 'PhotoTooLargeError'
  }
}

// MIME 타입이 허용 목록에 없거나, 매직 바이트가 실제 이미지 형식과 다를 때 (API가 415로 변환)
export class UnsupportedMediaError extends Error {
  constructor() {
    super('지원하지 않는 이미지 형식입니다')
    this.name = 'UnsupportedMediaError'
  }
}

type DetectedImageType = 'image/jpeg' | 'image/png'

// 버퍼의 매직 바이트로 실제 이미지 형식을 판별한다 (확장자·MIME 헤더는 위조 가능하므로 신뢰하지 않음)
// JPEG: FF D8 FF / PNG: 89 50 4E 47 0D 0A 1A 0A
export function detectImageType(buf: Buffer): DetectedImageType | null {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return 'image/jpeg'
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png'
  }
  return null
}

// 업로드된 사진을 UPLOAD_DIR에 저장하고 새 파일명을 반환한다.
// 파일명은 PRD 규칙대로 항상 {uuid}.jpg로 고정한다 (실제 형식이 PNG여도 확장자는 바꾸지 않음, ROADMAP Q8).
export async function savePhoto(file: File): Promise<string> {
  const check = checkPhotoFile({ size: file.size, type: file.type })
  if (!check.ok) {
    if (check.code === 'PAYLOAD_TOO_LARGE') throw new PhotoTooLargeError()
    throw new UnsupportedMediaError()
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // MIME 헤더는 클라이언트가 보낸 값이라 신뢰할 수 없으므로 매직 바이트로 실제 형식을 재확인한다
  if (detectImageType(buffer) === null) {
    throw new UnsupportedMediaError()
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const filename = `${randomUUID()}.jpg`
  const filePath = path.join(UPLOAD_DIR, filename)
  // flag 'wx': 동일 이름이 이미 있으면 실패 (uuid 충돌은 사실상 없지만 안전장치로 덮어쓰기를 막는다)
  await writeFile(filePath, buffer, { flag: 'wx' })

  return filename
}

// 사진 파일을 삭제한다. 파일이 이미 없으면(ENOENT) 예외를 던지지 않고 경고 로그만 남긴다
// (PRD §8: 레코드 삭제/교체 시 고아 레코드를 만들지 않되, 파일이 이미 없어도 요청은 성공 처리)
export async function deletePhoto(name: string): Promise<void> {
  const filePath = resolvePhotoPath(name)
  if (filePath === null) {
    console.warn(`[storage] 잘못된 파일명이라 삭제를 건너뜁니다: ${name}`)
    return
  }
  try {
    await unlink(filePath)
  } catch (error) {
    if (isEnoent(error)) {
      console.warn(`[storage] 삭제하려는 파일이 이미 없습니다: ${name}`)
      return
    }
    throw error
  }
}

// 파일명을 검증하고 UPLOAD_DIR 하위의 절대 경로로 변환한다.
// 정규식(uuid.jpg)에 맞지 않거나 path.resolve 결과가 UPLOAD_DIR 밖이면 null을 반환한다 (PRD §8 경로 조작 방지)
export function resolvePhotoPath(name: string): string | null {
  if (!PHOTO_FILENAME_PATTERN.test(name)) {
    return null
  }
  const resolved = path.resolve(UPLOAD_DIR, name)
  const uploadDirResolved = path.resolve(UPLOAD_DIR)
  if (!resolved.startsWith(uploadDirResolved + path.sep)) {
    return null
  }
  return resolved
}

// 사진 파일을 읽어 버퍼와 매직 바이트 기준 Content-Type을 반환한다.
// 파일명이 유효하지 않거나 파일이 없으면(ENOENT) null을 반환한다
export async function readPhoto(
  name: string
): Promise<{ buffer: Buffer; contentType: DetectedImageType } | null> {
  const filePath = resolvePhotoPath(name)
  if (filePath === null) return null

  let buffer: Buffer
  try {
    buffer = await readFile(filePath)
  } catch (error) {
    if (isEnoent(error)) return null
    throw error
  }

  // 파일명 확장자는 항상 .jpg지만 실제 형식은 매직 바이트로 판별한다 (ROADMAP Q8).
  // 판별 불가 시(저장 이후 파일이 손상된 경우 등) 기본값 image/jpeg로 응답한다
  const contentType = detectImageType(buffer) ?? 'image/jpeg'
  return { buffer, contentType }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
