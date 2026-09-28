// GET /api/photos/[file] - 사진 조회 (PRD §4)
// 파일명이 uuid.jpg 정규식에 맞지 않으면 파일시스템 조회 없이 400을 반환한다 (PRD §8 경로 조작 방지)
import { apiError } from '@/lib/api-error'
import { PHOTO_FILENAME_PATTERN } from '@/lib/schemas/photo'
import { readPhoto } from '@/lib/storage'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params

  // 정규식 검사를 먼저 통과해야만 파일시스템에 접근한다
  if (!PHOTO_FILENAME_PATTERN.test(file)) {
    return apiError(400, 'INVALID_FILENAME', '잘못된 파일명입니다')
  }

  const photo = await readPhoto(file)
  if (photo === null) {
    return apiError(404, 'NOT_FOUND', '사진을 찾을 수 없습니다')
  }

  return new Response(new Uint8Array(photo.buffer), {
    status: 200,
    headers: {
      'Content-Type': photo.contentType,
      // 파일명이 uuid라 내용이 절대 바뀌지 않으므로 1년 캐시 + immutable
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
