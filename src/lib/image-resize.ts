// 클라이언트에서 사진을 축소·재인코딩하는 모듈 (PRD §3 F3, §8 EXIF 회전·iOS HEIC 대응)
// 브라우저 API(createImageBitmap·canvas)만 사용하므로 반드시 클라이언트에서만 호출한다

import { RESIZE_JPEG_QUALITY, RESIZE_MAX_EDGE } from '@/lib/constants'

// 두 디코딩 경로(ImageBitmap·HTMLImageElement)가 모두 실패했을 때 던지는 오류
export class ImageDecodeError extends Error {
  constructor(message = '이미지를 디코딩할 수 없습니다') {
    super(message)
    this.name = 'ImageDecodeError'
  }
}

// 디코딩 경로별 결과를 canvas 그리기 인터페이스로 통일한다
interface DecodedImage {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  cleanup: () => void
}

// 1순위: createImageBitmap. imageOrientation: 'from-image'로 EXIF 회전을 픽셀에 반영해 정방향으로 만든다
async function decodeWithImageBitmap(file: File): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })
  return {
    width: bitmap.width,
    height: bitmap.height,
    draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
    cleanup: () => bitmap.close(),
  }
}

// 2순위(대체): createImageBitmap을 지원하지 않거나 실패하는 환경(구형 iOS 등)용 HTMLImageElement 경로
async function decodeWithImageElement(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  try {
    await img.decode()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, width, height) => ctx.drawImage(img, 0, 0, width, height),
    cleanup: () => URL.revokeObjectURL(url),
  }
}

// 두 경로를 순서대로 시도하고, 둘 다 실패하면 ImageDecodeError를 던진다
async function decodeImage(file: File): Promise<DecodedImage> {
  try {
    return await decodeWithImageBitmap(file)
  } catch {
    try {
      return await decodeWithImageElement(file)
    } catch {
      throw new ImageDecodeError()
    }
  }
}

function encodeJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(new ImageDecodeError('이미지 변환에 실패했습니다')),
      'image/jpeg',
      quality
    )
  })
}

// 원본 파일명의 확장자를 제거하고 .jpg를 붙인다
function toJpegFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}.jpg`
}

// 사진을 긴 변 기준 RESIZE_MAX_EDGE 이하로 축소하고 JPEG(RESIZE_JPEG_QUALITY)로 재인코딩한 File을 반환한다
export async function resizeImage(file: File): Promise<File> {
  const decoded = await decodeImage(file)
  try {
    const longestEdge = Math.max(decoded.width, decoded.height)
    const scale = Math.min(1, RESIZE_MAX_EDGE / longestEdge)
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageDecodeError('캔버스를 생성할 수 없습니다')
    decoded.draw(ctx, width, height)

    const blob = await encodeJpeg(canvas, RESIZE_JPEG_QUALITY)
    const result = new File([blob], toJpegFileName(file.name), {
      type: 'image/jpeg',
    })

    if (process.env.NODE_ENV === 'development') {
      console.debug(
        '[resize]',
        `원본 ${file.type || '알수없음'} ${file.size}B ${decoded.width}x${decoded.height}`,
        '→',
        `결과 ${result.size}B ${width}x${height}`
      )
    }

    return result
  } finally {
    decoded.cleanup()
  }
}
