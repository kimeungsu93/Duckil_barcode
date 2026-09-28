// db.ts·records-repo.ts 실측 검증 스크립트
// 실행: DATA_DIR=<임시폴더> node --import ./scripts/register-alias.mjs scripts/check-repo.ts
// DATA_DIR는 반드시 빈 임시 폴더를 지정한다 (실제 data/를 오염시키지 않기 위함).
// env.ts가 import 시점에 process.env.DATA_DIR을 읽으므로 환경변수로 미리 넘겨야 한다.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { env, UPLOAD_DIR } from '@/lib/env'
import { getDb } from '@/lib/db'
import {
  countRecordsInRange,
  deleteRecord,
  existsByProductLot,
  findRecordById,
  insertRecord,
  listRecords,
  listRecordsForExport,
  updateRecord,
} from '@/lib/records-repo'

let failed = 0
function check(name: string, pass: boolean, detail?: string): void {
  if (!pass) failed++
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`
  )
}

function planOf(sql: string, params: Record<string, unknown> = {}): string {
  const rows = getDb().prepare(`EXPLAIN QUERY PLAN ${sql}`).all(params) as {
    detail: string
  }[]
  return rows.map(r => r.detail).join(' | ')
}

function kstStart(dateString: string): string {
  return `${dateString}T00:00:00+09:00`
}

// ── 0. DATA_DIR 안전장치 및 초기 상태 확인 ─────────────────────────────
console.log(`DATA_DIR = ${env.DATA_DIR}`)
if (!env.DATA_DIR.includes('scratchpad') && !env.DATA_DIR.includes('tmp')) {
  console.error(
    'DATA_DIR가 임시 폴더로 보이지 않습니다. 실제 data/ 오염을 막기 위해 중단합니다.'
  )
  process.exit(1)
}
const dbFilePath = path.join(env.DATA_DIR, 'app.db')
check('시작 전 DB 파일 없음(빈 폴더)', !existsSync(dbFilePath))

// ── 1. getDb(): 빈 폴더에서 DB·테이블·인덱스 자동 생성 ─────────────────
const db = getDb()
check('getDb() 후 DB 파일 생성', existsSync(dbFilePath))
check('getDb() 후 uploads 폴더 생성', existsSync(UPLOAD_DIR))

const tableRow = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='records'"
  )
  .get() as { name: string } | undefined
check('records 테이블 생성', tableRow?.name === 'records')

const indexNames = (
  db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as {
    name: string
  }[]
).map(r => r.name)
check(
  'idx_records_created 인덱스 생성',
  indexNames.includes('idx_records_created')
)
check(
  'idx_records_product_lot 인덱스 생성',
  indexNames.includes('idx_records_product_lot')
)

const userVersion = db.pragma('user_version', { simple: true }) as number
check('user_version = 1', userVersion === 1)

const walMode = db.pragma('journal_mode', { simple: true }) as string
check('journal_mode = wal', walMode === 'wal', walMode)

check('getDb() 싱글턴(같은 인스턴스 재사용)', getDb() === db)

// ── 2. CRUD ─────────────────────────────────────────────────────────
const created = insertRecord({
  raw_text: 'RAW-0001',
  product_no: 'CRUD-P1',
  lot: 'L1',
  memo: '메모',
})
check('insertRecord: id 부여', typeof created.id === 'number' && created.id > 0)
check(
  'insertRecord: created_at=updated_at 형식',
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(created.created_at) &&
    created.created_at === created.updated_at
)
check(
  'insertRecord: 사진 미지정 시 null',
  created.barcode_photo === null && created.product_photo === null
)

const found = findRecordById(created.id)
check('findRecordById: 조회 성공', found?.product_no === 'CRUD-P1')
check(
  'findRecordById: 없는 id는 undefined',
  findRecordById(999999) === undefined
)

const updated = updateRecord(created.id, { memo: '수정된 메모' })
check(
  'updateRecord: 보낸 필드만 반영',
  updated?.memo === '수정된 메모' && updated?.product_no === 'CRUD-P1'
)
check(
  'updateRecord: created_at 불변',
  updated !== undefined && updated.created_at === created.created_at
)

const emptyPatchResult = updateRecord(created.id, {})
check(
  'updateRecord: 빈 patch는 현재 row 그대로 반환',
  emptyPatchResult?.memo === '수정된 메모'
)

const patchedPhoto = updateRecord(created.id, { barcode_photo: 'x.jpg' })
check(
  'updateRecord: barcode_photo 갱신',
  patchedPhoto?.barcode_photo === 'x.jpg'
)
const clearedPhoto = updateRecord(created.id, { barcode_photo: null })
check(
  'updateRecord: barcode_photo null로 초기화',
  clearedPhoto?.barcode_photo === null
)
check(
  'updateRecord: 없는 id는 undefined',
  updateRecord(999999, { memo: 'x' }) === undefined
)

const deleted = deleteRecord(created.id)
check('deleteRecord: 삭제된 row 반환', deleted?.id === created.id)
check(
  'deleteRecord: 삭제 후 조회 불가',
  findRecordById(created.id) === undefined
)
check(
  'deleteRecord: 없는 id는 undefined',
  deleteRecord(created.id) === undefined
)

// ── 3. 검색 이스케이프(%, _, \)와 대소문자 무시 (F4-3, Q13) ────────────
const wildMarker = 'WILD'
insertRecord({ raw_text: 'r', product_no: `${wildMarker}-A_C`, lot: 'L' }) // 리터럴 밑줄
insertRecord({ raw_text: 'r', product_no: `${wildMarker}-ABC`, lot: 'L' }) // 밑줄 자리에 다른 문자
insertRecord({ raw_text: 'r', product_no: `${wildMarker}-A%C`, lot: 'L' }) // 리터럴 퍼센트
insertRecord({ raw_text: 'r', product_no: `${wildMarker}-AXXXC`, lot: 'L' }) // 퍼센트 자리에 여러 문자
insertRecord({ raw_text: 'r', product_no: `${wildMarker}-A\\C`, lot: 'L' }) // 리터럴 백슬래시
insertRecord({
  raw_text: 'r',
  product_no: `${wildMarker}-CaseTest-XYZ`,
  lot: 'L',
})
insertRecord({
  raw_text: 'r',
  product_no: `${wildMarker}-Other`,
  lot: `${wildMarker}-LotOnly`,
})

const underscoreHit = listRecords({
  q: `${wildMarker}-A_C`,
  limit: 10,
  offset: 0,
})
check(
  '검색: _ 리터럴 매치(와일드카드 아님)',
  underscoreHit.rows.some(r => r.product_no === `${wildMarker}-A_C`)
)
check(
  '검색: _ 자리에 다른 문자인 값은 매치 안 됨',
  !underscoreHit.rows.some(r => r.product_no === `${wildMarker}-ABC`)
)

const percentHit = listRecords({ q: `${wildMarker}-A%C`, limit: 10, offset: 0 })
check(
  '검색: % 리터럴 매치(와일드카드 아님)',
  percentHit.rows.some(r => r.product_no === `${wildMarker}-A%C`)
)
check(
  '검색: % 자리에 여러 문자인 값은 매치 안 됨',
  !percentHit.rows.some(r => r.product_no === `${wildMarker}-AXXXC`)
)

const backslashHit = listRecords({
  q: `${wildMarker}-A\\C`,
  limit: 10,
  offset: 0,
})
check(
  '검색: \\ 리터럴 매치',
  backslashHit.rows.some(r => r.product_no === `${wildMarker}-A\\C`)
)

const caseInsensitive = listRecords({
  q: `${wildMarker.toLowerCase()}-casetest`,
  limit: 10,
  offset: 0,
})
check(
  '검색: 대소문자 무시(ASCII, F4-3)',
  caseInsensitive.rows.some(r => r.product_no === `${wildMarker}-CaseTest-XYZ`)
)

const lotSearch = listRecords({
  q: `${wildMarker}-lotonly`,
  limit: 10,
  offset: 0,
})
check(
  '검색: lot 컬럼도 대소문자 무시로 매치',
  lotSearch.rows.some(r => r.lot === `${wildMarker}-LotOnly`)
)

// ── 4. 중복 판정 existsByProductLot: trim + 대소문자 구분 정확 일치 (Q9) ─
const dupProductNo = 'DUP-P-정확'
const dupLot = 'DUP-L-정확'
insertRecord({ raw_text: 'r', product_no: dupProductNo, lot: dupLot })
check(
  'existsByProductLot: 정확 일치 true',
  existsByProductLot(dupProductNo, dupLot)
)
check(
  'existsByProductLot: trim 후 일치도 true',
  existsByProductLot(`  ${dupProductNo}  `, `\t${dupLot}\n`)
)
check(
  'existsByProductLot: 대소문자 다르면 false(Q9는 대소문자 구분, Q13과 구별)',
  existsByProductLot(dupProductNo.toLowerCase(), dupLot) === false
)
check(
  'existsByProductLot: 부분 일치는 false(정확 일치만)',
  existsByProductLot(dupProductNo.slice(0, -1), dupLot) === false
)
check(
  'existsByProductLot: 없는 조합은 false',
  existsByProductLot('NOPE-1', 'NOPE-2') === false
)

// ── 5. 같은 created_at 기록의 id 순서 (Q16) ────────────────────────────
const sameDay = '2030-06-12'
const sameCreatedAt = `${sameDay}T10:00:00+09:00`
const sameMarker = 'SAMECREATED'
const insertRaw = db.prepare(
  `INSERT INTO records (raw_text, product_no, lot, memo, barcode_photo, product_photo, created_at, updated_at)
   VALUES (@raw_text, @product_no, @lot, NULL, NULL, NULL, @created_at, @created_at)`
)
const sameIds: number[] = []
for (let i = 1; i <= 3; i++) {
  const info = insertRaw.run({
    raw_text: 'r',
    product_no: `${sameMarker}-${i}`,
    lot: sameMarker,
    created_at: sameCreatedAt,
  })
  sameIds.push(Number(info.lastInsertRowid))
}
check(
  '같은 created_at 3건 삽입(id 오름차순 생성)',
  sameIds[0] < sameIds[1] && sameIds[1] < sameIds[2]
)

const listSameIds = listRecords({ q: sameMarker, limit: 10, offset: 0 })
  .rows.filter(r => r.lot === sameMarker)
  .map(r => r.id)
check(
  '목록(listRecords): 같은 created_at이면 id DESC',
  JSON.stringify(listSameIds) === JSON.stringify([...sameIds].reverse())
)

const exportSameIds = listRecordsForExport(sameDay, sameDay)
  .filter(r => r.lot === sameMarker)
  .map(r => r.id)
check(
  '내보내기(listRecordsForExport): 같은 created_at이면 id ASC(스캔 순서, Q16)',
  JSON.stringify(exportSameIds) === JSON.stringify(sameIds)
)

// ── 6. 23:59:59 / 00:00:00 KST 경계 (Q2) ───────────────────────────────
const boundaryDay = '2030-07-01'
const boundaryNextDay = '2030-07-02'
const lastMoment = `${boundaryDay}T23:59:59+09:00`
const firstMomentNextDay = `${boundaryNextDay}T00:00:00+09:00`

insertRaw.run({
  raw_text: 'r',
  product_no: 'BOUND-LAST',
  lot: 'BOUND',
  created_at: lastMoment,
})
insertRaw.run({
  raw_text: 'r',
  product_no: 'BOUND-FIRST-NEXT',
  lot: 'BOUND',
  created_at: firstMomentNextDay,
})

check(
  '경계: 전날(boundaryDay) 범위는 23:59:59 기록만 포함(count=1)',
  countRecordsInRange(boundaryDay, boundaryDay) === 1
)
check(
  '경계: 다음날 00:00:00 기록은 전날 범위에서 제외',
  !listRecords({
    q: 'BOUND',
    from: boundaryDay,
    to: boundaryDay,
    limit: 10,
    offset: 0,
  }).rows.some(r => r.product_no === 'BOUND-FIRST-NEXT')
)
check(
  '경계: 다음날(boundaryNextDay) 범위는 00:00:00 기록만 포함(count=1)',
  countRecordsInRange(boundaryNextDay, boundaryNextDay) === 1 &&
    listRecords({
      q: 'BOUND',
      from: boundaryNextDay,
      to: boundaryNextDay,
      limit: 10,
      offset: 0,
    }).rows.some(r => r.product_no === 'BOUND-FIRST-NEXT')
)
check(
  '경계: 두 날짜를 합친 범위는 2건',
  countRecordsInRange(boundaryDay, boundaryNextDay) === 2
)

// ── 7. listRecords total 페이지네이션 일관성 ───────────────────────────
const page1 = listRecords({ q: 'BOUND', limit: 1, offset: 0 })
const page2 = listRecords({ q: 'BOUND', limit: 1, offset: 1 })
check(
  'listRecords: total은 limit/offset과 무관하게 동일',
  page1.total === 2 && page2.total === 2
)
check('listRecords: limit 적용', page1.rows.length === 1)

// ── 8. EXPLAIN QUERY PLAN ───────────────────────────────────────────────
const planList = planOf(
  'SELECT * FROM records ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset',
  { limit: 20, offset: 0 }
)
console.log(`plan[목록 정렬]  ${planList}`)
check(
  'EXPLAIN: 목록 정렬은 idx_records_created로 TEMP B-TREE 없이 처리',
  planList.includes('idx_records_created') && !planList.includes('TEMP B-TREE')
)

const planRange = planOf(
  'SELECT * FROM records WHERE created_at >= @from AND created_at < @to ORDER BY created_at ASC, id ASC',
  { from: kstStart(boundaryDay), to: kstStart(boundaryNextDay) }
)
console.log(`plan[기간 조회]  ${planRange}`)
check(
  'EXPLAIN: 기간 조회는 idx_records_created 사용',
  planRange.includes('idx_records_created')
)

const planCount = planOf(
  'SELECT COUNT(*) FROM records WHERE created_at >= @from AND created_at < @to',
  { from: kstStart(boundaryDay), to: kstStart(boundaryNextDay) }
)
console.log(`plan[기간 건수]  ${planCount}`)
check(
  'EXPLAIN: 기간 건수는 idx_records_created COVERING INDEX 사용',
  planCount.includes('idx_records_created') && planCount.includes('COVERING')
)

const planExists = planOf(
  'SELECT 1 FROM records WHERE product_no = @productNo AND lot = @lot LIMIT 1',
  { productNo: dupProductNo, lot: dupLot }
)
console.log(`plan[중복 판정]  ${planExists}`)
check(
  'EXPLAIN: 중복 판정은 idx_records_product_lot 사용',
  planExists.includes('idx_records_product_lot')
)

const planLike = planOf(
  "SELECT * FROM records WHERE (product_no LIKE @q ESCAPE '\\' OR lot LIKE @q ESCAPE '\\') ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset",
  { q: '%abc%', limit: 20, offset: 0 }
)
console.log(`plan[검색 LIKE]  ${planLike}`)
check(
  'EXPLAIN: 부분 일치 검색은 SCAN(인덱스로 좁힐 수 없음)',
  planLike.includes('SCAN')
)

// ── 결과 ────────────────────────────────────────────────────────────
console.log(failed === 0 ? '\n모든 검사 통과' : `\n실패 ${failed}건`)
process.exit(failed === 0 ? 0 : 1)
