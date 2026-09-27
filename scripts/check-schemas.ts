// 공용 Zod 스키마·사진 검사 경계값 확인
// 실행: node --import ./scripts/register-alias.mjs scripts/check-schemas.ts
import {
  createRecordSchema,
  listQuerySchema,
  recordIdSchema,
  updateRecordSchema,
} from '@/lib/schemas/record'
import { exportQuerySchema } from '@/lib/schemas/export'
import { checkPhotoFile, photoFilenameSchema } from '@/lib/schemas/photo'
import { PHOTO_MAX_BYTES } from '@/lib/constants'

const base = { raw_text: 'A', product_no: 'P-1', lot: 'L-1' }
const uuidFile = '5f2c1d3e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.jpg'

const cases: [string, boolean, boolean][] = [
  // [설명, 실제 성공 여부, 기대 성공 여부]
  [
    'raw_text 0자',
    createRecordSchema.safeParse({ ...base, raw_text: '' }).success,
    false,
  ],
  [
    'raw_text 2000자',
    createRecordSchema.safeParse({ ...base, raw_text: 'a'.repeat(2000) })
      .success,
    true,
  ],
  [
    'raw_text 2001자',
    createRecordSchema.safeParse({ ...base, raw_text: 'a'.repeat(2001) })
      .success,
    false,
  ],
  [
    'product_no 공백만',
    createRecordSchema.safeParse({ ...base, product_no: '   ' }).success,
    false,
  ],
  [
    'product_no 100자',
    createRecordSchema.safeParse({ ...base, product_no: 'p'.repeat(100) })
      .success,
    true,
  ],
  [
    'product_no 101자',
    createRecordSchema.safeParse({ ...base, product_no: 'p'.repeat(101) })
      .success,
    false,
  ],
  [
    'lot 공백만',
    createRecordSchema.safeParse({ ...base, lot: ' ' }).success,
    false,
  ],
  [
    'memo 500자',
    createRecordSchema.safeParse({ ...base, memo: 'm'.repeat(500) }).success,
    true,
  ],
  [
    'memo 501자',
    createRecordSchema.safeParse({ ...base, memo: 'm'.repeat(501) }).success,
    false,
  ],
  [
    'update에 raw_text 무시',
    !('raw_text' in (updateRecordSchema.parse({ raw_text: 'x' }) as object)),
    true,
  ],
  ['id "1"', recordIdSchema.safeParse('1').success, true],
  ['id "0"', recordIdSchema.safeParse('0').success, false],
  ['id "1.5"', recordIdSchema.safeParse('1.5').success, false],
  ['id "abc"', recordIdSchema.safeParse('abc').success, false],
  [
    'list 기본값',
    listQuerySchema.parse({}).limit === 20 &&
      listQuerySchema.parse({}).offset === 0,
    true,
  ],
  ['list limit 100', listQuerySchema.safeParse({ limit: '100' }).success, true],
  [
    'list limit 101',
    listQuerySchema.safeParse({ limit: '101' }).success,
    false,
  ],
  [
    'list offset -1',
    listQuerySchema.safeParse({ offset: '-1' }).success,
    false,
  ],
  [
    'list from>to',
    listQuerySchema.safeParse({ from: '2026-09-02', to: '2026-09-01' }).success,
    false,
  ],
  [
    'export 정상',
    exportQuerySchema.safeParse({ from: '2026-09-01', to: '2026-09-01' })
      .success,
    true,
  ],
  [
    'export from>to',
    exportQuerySchema.safeParse({ from: '2026-09-02', to: '2026-09-01' })
      .success,
    false,
  ],
  [
    'export 형식 오류',
    exportQuerySchema.safeParse({ from: '2026/09/01', to: '2026-09-01' })
      .success,
    false,
  ],
  [
    'export 없는 날짜',
    exportQuerySchema.safeParse({ from: '2026-02-30', to: '2026-03-01' })
      .success,
    false,
  ],
  [
    'export to 누락',
    exportQuerySchema.safeParse({ from: '2026-09-01' }).success,
    false,
  ],
  ['파일명 정상', photoFilenameSchema.safeParse(uuidFile).success, true],
  ['파일명 ../x.jpg', photoFilenameSchema.safeParse('../x.jpg').success, false],
  [
    '파일명 대문자 uuid',
    photoFilenameSchema.safeParse(uuidFile.toUpperCase()).success,
    false,
  ],
  [
    '파일명 .png',
    photoFilenameSchema.safeParse(uuidFile.replace('.jpg', '.png')).success,
    false,
  ],
  [
    '사진 JPEG 5MB',
    checkPhotoFile({ size: PHOTO_MAX_BYTES, type: 'image/jpeg' }).ok,
    true,
  ],
]

const photoCodes: [string, string, string][] = [
  [
    '사진 6MB',
    codeOf({ size: 6 * 1024 * 1024, type: 'image/jpeg' }),
    'PAYLOAD_TOO_LARGE',
  ],
  [
    '사진 image/gif',
    codeOf({ size: 1000, type: 'image/gif' }),
    'UNSUPPORTED_MEDIA_TYPE',
  ],
  [
    '사진 HEIC',
    codeOf({ size: 1000, type: 'image/heic' }),
    'UNSUPPORTED_MEDIA_TYPE',
  ],
]

function codeOf(file: { size: number; type: string }): string {
  const result = checkPhotoFile(file)
  return result.ok ? 'OK' : result.code
}

let failed = 0
for (const [name, actual, expected] of cases) {
  const pass = actual === expected
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`)
}
for (const [name, actual, expected] of photoCodes) {
  const pass = actual === expected
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} → ${actual}`)
}

// trim 결과 확인
const trimmed = createRecordSchema.parse({ ...base, product_no: '  P-9  ' })
console.log(
  `${trimmed.product_no === 'P-9' ? 'PASS' : 'FAIL'}  product_no trim`
)
if (trimmed.product_no !== 'P-9') failed++

console.log(failed === 0 ? '\n모든 검사 통과' : `\n실패 ${failed}건`)
process.exit(failed === 0 ? 0 : 1)
