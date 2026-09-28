// src/lib/storage.ts 검증 스크립트. DB를 건드리지 않으므로 실제 data/를 오염시키지 않기 위해
// 실행 전 DATA_DIR 환경변수를 스크래치 임시 폴더로 지정해야 한다.
// 사용: DATA_DIR=<임시폴더> node --import ./scripts/register-alias.mjs scripts/check-storage.ts
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_DIR, env } from '@/lib/env'
import {
  PhotoTooLargeError,
  UnsupportedMediaError,
  deletePhoto,
  detectImageType,
  readPhoto,
  resolvePhotoPath,
  savePhoto,
} from '@/lib/storage'

const MOCK_DIR = path.join(process.cwd(), 'public', 'mock')

// DATA_DIR가 스크래치 임시 폴더를 가리키는지 확인해 실수로 실제 data/를 건드리지 않게 한다
if (!env.DATA_DIR.includes('scratchpad')) {
  throw new Error(
    `DATA_DIR가 스크래치 임시 폴더를 가리키지 않습니다: ${env.DATA_DIR}`
  )
}

async function toFile(filePath: string, type: string): Promise<File> {
  const buffer = await readFile(filePath)
  return new File([new Uint8Array(buffer)], path.basename(filePath), { type })
}

let passed = 0
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    passed += 1
    console.log(`✅ ${name}`)
  } catch (error) {
    console.error(`❌ ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

await check('detectImageType: JPEG 매직 바이트 인식', async () => {
  const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  assert.equal(detectImageType(buf), 'image/jpeg')
})

await check('detectImageType: PNG 매직 바이트 인식', async () => {
  const buf = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ])
  assert.equal(detectImageType(buf), 'image/png')
})

await check('detectImageType: 알 수 없는 형식은 null', async () => {
  const buf = Buffer.from('이것은 이미지가 아닙니다', 'utf-8')
  assert.equal(detectImageType(buf), null)
})

let savedJpegName = ''
await check('savePhoto: 정상 JPEG 저장 후 uuid.jpg 파일명 반환', async () => {
  const file = await toFile(
    path.join(MOCK_DIR, 'barcode-sample.jpg'),
    'image/jpeg'
  )
  const name = await savePhoto(file)
  assert.match(
    name,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/
  )
  const savedStat = await stat(path.join(UPLOAD_DIR, name))
  assert.ok(savedStat.isFile())
  savedJpegName = name
})

await check('savePhoto: 크기 초과 시 PhotoTooLargeError', async () => {
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 0)
  const file = new File([new Uint8Array(oversized)], 'big.jpg', {
    type: 'image/jpeg',
  })
  await assert.rejects(() => savePhoto(file), PhotoTooLargeError)
})

await check(
  'savePhoto: 허용되지 않은 MIME 타입은 UnsupportedMediaError',
  async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const file = new File([new Uint8Array(buf)], 'a.gif', {
      type: 'image/gif',
    })
    await assert.rejects(() => savePhoto(file), UnsupportedMediaError)
  }
)

await check(
  'savePhoto: MIME은 image/jpeg지만 매직 바이트 불일치 시 UnsupportedMediaError (Q8)',
  async () => {
    const buf = Buffer.from('가짜 jpeg 내용입니다', 'utf-8')
    const file = new File([new Uint8Array(buf)], 'fake.jpg', {
      type: 'image/jpeg',
    })
    await assert.rejects(() => savePhoto(file), UnsupportedMediaError)
  }
)

await check(
  'savePhoto: PNG 매직 바이트도 저장 허용되고 파일명은 .jpg로 고정 (Q8)',
  async () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
    const body = Buffer.concat([pngHeader, Buffer.alloc(100, 1)])
    const file = new File([new Uint8Array(body)], 'a.png', {
      type: 'image/png',
    })
    const name = await savePhoto(file)
    assert.match(name, /\.jpg$/)
    const photo = await readPhoto(name)
    assert.equal(photo?.contentType, 'image/png')
    await deletePhoto(name)
  }
)

await check(
  'resolvePhotoPath: 정상 uuid.jpg는 UPLOAD_DIR 하위 절대경로 반환',
  async () => {
    const resolved = resolvePhotoPath(savedJpegName)
    assert.ok(resolved !== null)
    assert.ok(resolved!.startsWith(path.resolve(UPLOAD_DIR) + path.sep))
  }
)

const invalidNames = [
  '../etc/passwd',
  '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  'abc.png',
  '3F2504E0-4F89-11D3-9A0C-0305E82C3301.jpg', // 대문자 uuid
  '3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpeg', // 잘못된 확장자
]

await check('resolvePhotoPath: 잘못된 파일명 5종은 모두 null', async () => {
  for (const name of invalidNames) {
    assert.equal(resolvePhotoPath(name), null, `실패: ${name}`)
  }
})

await check(
  'readPhoto: 저장된 JPEG를 읽으면 버퍼와 image/jpeg 반환',
  async () => {
    const photo = await readPhoto(savedJpegName)
    assert.ok(photo !== null)
    assert.equal(photo!.contentType, 'image/jpeg')
    assert.ok(photo!.buffer.length > 0)
  }
)

await check('readPhoto: 형식은 맞지만 존재하지 않는 파일은 null', async () => {
  const photo = await readPhoto('00000000-0000-4000-8000-000000000000.jpg')
  assert.equal(photo, null)
})

await check('readPhoto: 잘못된 파일명은 fs 접근 없이 null', async () => {
  const photo = await readPhoto('../etc/passwd')
  assert.equal(photo, null)
})

await check(
  'deletePhoto: 저장된 파일을 삭제하면 이후 readPhoto가 null',
  async () => {
    await deletePhoto(savedJpegName)
    const photo = await readPhoto(savedJpegName)
    assert.equal(photo, null)
  }
)

await check(
  'deletePhoto: 이미 없는 파일(ENOENT)을 삭제해도 예외 없이 통과',
  async () => {
    await deletePhoto(savedJpegName) // 방금 위에서 이미 삭제함
  }
)

console.log(`\n${passed}개 통과`)
if (process.exitCode === 1) {
  console.error('일부 검증 실패')
  process.exit(1)
} else {
  console.log('모든 검증 통과')
}
