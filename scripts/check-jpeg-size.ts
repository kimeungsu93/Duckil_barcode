// jpeg-size.ts 검증 스크립트 (Node 24 타입 스트리핑)
// 실행: node --import ./scripts/register-alias.mjs scripts/check-jpeg-size.ts
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { readJpegSize } from '@/lib/jpeg-size'

let failCount = 0

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(actual)} (기대값 ${JSON.stringify(expected)})`
  )
  if (!ok) failCount++
}

async function main() {
  const mockDir = path.resolve(process.cwd(), 'public/mock')

  // 3:1 비율 샘플 (800x267)
  const barcodeBuf = await readFile(path.join(mockDir, 'barcode-sample.jpg'))
  check('barcode-sample.jpg 크기', readJpegSize(barcodeBuf), {
    width: 800,
    height: 267,
  })

  // 5:1 비율 샘플 (800x160)
  const productBuf = await readFile(path.join(mockDir, 'product-sample.jpg'))
  check('product-sample.jpg 크기', readJpegSize(productBuf), {
    width: 800,
    height: 160,
  })

  // PNG 버퍼 → null (JPEG SOI가 아니므로)
  const pngBuf = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ])
  check('PNG 버퍼', readJpegSize(pngBuf), null)

  // 잘린/손상된 버퍼 → 예외 없이 null
  // 1) SOI만 있고 그 뒤가 없음
  check('SOI만 있는 버퍼', readJpegSize(Buffer.from([0xff, 0xd8])), null)
  // 2) 실제 JPEG를 SOF 마커 진입 전에 절단
  const truncated = barcodeBuf.subarray(0, 20)
  check('절단된 JPEG 버퍼', readJpegSize(truncated), null)
  // 3) 완전히 임의의 바이트(빈 버퍼)
  check('빈 버퍼', readJpegSize(Buffer.alloc(0)), null)
  // 4) SOI + 마커는 있는데 길이 필드가 잘린 경우
  check(
    '길이 필드가 잘린 버퍼',
    readJpegSize(Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00])),
    null
  )

  console.log(failCount === 0 ? '\n모든 검증 통과' : `\n${failCount}건 실패`)
  if (failCount > 0) process.exitCode = 1
}

main()
