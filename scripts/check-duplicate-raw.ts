// 운영 DB의 원본 바코드(raw_key) 중복 묶음 리포트 (ROADMAP Phase 7 Task 025)
// v2 마이그레이션은 기존 중복이 있으면 UNIQUE 대신 일반 인덱스를 만든다. 이 스크립트로 중복을 확인·정리한 뒤
// 다음 마이그레이션에서 UNIQUE로 올린다. 읽기 전용이며 DB를 바꾸지 않는다.
//
// 실행: DATA_DIR=<데이터 폴더> node --import ./scripts/register-alias.mjs scripts/check-duplicate-raw.ts
import { getDb } from '@/lib/db'

const db = getDb()

const groups = db
  .prepare(
    `SELECT raw_key, COUNT(*) AS count FROM records
     WHERE raw_key IS NOT NULL
     GROUP BY raw_key HAVING COUNT(*) > 1
     ORDER BY count DESC`
  )
  .all() as { raw_key: string; count: number }[]

const uniqueIndex = db
  .prepare(
    "SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_records_raw_key'"
  )
  .pluck()
  .get() as string | undefined

console.log(
  `raw_key 인덱스: ${uniqueIndex?.includes('UNIQUE') ? 'UNIQUE' : uniqueIndex ? '일반(중복 존재로 대체됨)' : '없음'}`
)
console.log(`중복 묶음: ${groups.length}개`)

const listRows = db.prepare(
  `SELECT id, product_no, lot, created_at,
          (barcode_photo IS NOT NULL) + (product_photo IS NOT NULL) + (lighting_photo IS NOT NULL) AS photos
   FROM records WHERE raw_key = @key ORDER BY id`
)
for (const group of groups) {
  console.log(`\n[${group.count}건] ${group.raw_key}`)
  for (const row of listRows.all({ key: group.raw_key }) as {
    id: number
    product_no: string
    lot: string
    created_at: string
    photos: number
  }[]) {
    console.log(
      `  id=${row.id} ${row.product_no} / ${row.lot} / ${row.created_at} / 사진 ${row.photos}장`
    )
  }
}

if (groups.length > 0) process.exitCode = 1
