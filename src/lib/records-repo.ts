// 서버 전용 - records 테이블 CRUD·검색·기간 조회 리포지토리 (PRD §6, §8, ROADMAP Q2·Q9·Q13·Q16, Phase 7)
import 'server-only'
import { getDb } from '@/lib/db'
import { toRawKey } from '@/lib/raw-key'
import { kstDayStart, kstNextDayStart, nowKstIso } from '@/lib/time'
import type { RecordRow } from '@/lib/types/record'

// 뒤 작업(Task 011 API 라우트 등)이 쓰기 좋게 입력·패치 타입을 export한다

// POST /api/records: 사진 파일명은 저장(storage.ts) 이후 결정되므로 선택값으로 받는다
// raw_key는 raw_text에서 계산하므로 입력으로 받지 않는다 (src/lib/raw-key.ts)
export interface InsertRecordInput {
  raw_text: string
  product_no: string
  lot: string
  memo?: string | null
  barcode_photo?: string | null
  product_photo?: string | null
  lighting_photo?: string | null
}

// PATCH /api/records/[id]: 보낸 키만 UPDATE SET에 반영한다 (raw_text는 생성 후 변경 불가)
export interface UpdateRecordPatch {
  product_no?: string
  lot?: string
  memo?: string | null
  barcode_photo?: string | null
  product_photo?: string | null
  lighting_photo?: string | null
}

// GET /api/records 쿼리
export interface ListRecordsQuery {
  q?: string
  limit: number
  offset: number
  from?: string
  to?: string
}

export interface ListRecordsResult {
  rows: RecordRow[]
  total: number
}

// UPDATE 시 실제로 SET할 컬럼만 화이트리스트로 제한한다 (컬럼명은 절대 사용자 입력에서 만들지 않음)
const UPDATABLE_COLUMNS = [
  'product_no',
  'lot',
  'memo',
  'barcode_photo',
  'product_photo',
  'lighting_photo',
] as const

// LIKE 검색 입력의 와일드카드·이스케이프 문자를 리터럴로 취급되게 이스케이프한다
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, char => `\\${char}`)
}

// from/to(KST 날짜 문자열) 기간 조건을 만든다. created_at 문자열 비교가 성립하도록
// kstDayStart/kstNextDayStart로 경계를 고정 형식 문자열로 변환한다 (Q2)
function buildRangeClause(
  from?: string,
  to?: string
): { conditions: string[]; params: Record<string, string> } {
  const conditions: string[] = []
  const params: Record<string, string> = {}
  if (from) {
    conditions.push('created_at >= @from')
    params.from = kstDayStart(from)
  }
  if (to) {
    conditions.push('created_at < @to')
    params.to = kstNextDayStart(to)
  }
  return { conditions, params }
}

// 목록 조회용: 기간 조건 + 검색어 조건(부분 일치, 대소문자 무시, F4-3)
function buildListClause(query: { q?: string; from?: string; to?: string }): {
  conditions: string[]
  params: Record<string, string>
} {
  const { conditions, params } = buildRangeClause(query.from, query.to)
  if (query.q) {
    conditions.push(
      "(product_no LIKE @q ESCAPE '\\' OR lot LIKE @q ESCAPE '\\')"
    )
    params.q = `%${escapeLike(query.q)}%`
  }
  return { conditions, params }
}

// 새 기록 생성. created_at/updated_at은 항상 nowKstIso()로 명시 삽입한다 (SQLite 시각 함수 미사용, Q2)
export function insertRecord(input: InsertRecordInput): RecordRow {
  const now = nowKstIso()
  return getDb()
    .prepare(
      `INSERT INTO records
         (raw_text, raw_key, product_no, lot, memo, barcode_photo, product_photo, lighting_photo, created_at, updated_at)
       VALUES
         (@raw_text, @raw_key, @product_no, @lot, @memo, @barcode_photo, @product_photo, @lighting_photo, @now, @now)
       RETURNING *`
    )
    .get({
      raw_text: input.raw_text,
      raw_key: toRawKey(input.raw_text),
      product_no: input.product_no,
      lot: input.lot,
      memo: input.memo ?? null,
      barcode_photo: input.barcode_photo ?? null,
      product_photo: input.product_photo ?? null,
      lighting_photo: input.lighting_photo ?? null,
      now,
    }) as RecordRow
}

// id로 단건 조회. 없으면 undefined
export function findRecordById(id: number): RecordRow | undefined {
  return getDb().prepare('SELECT * FROM records WHERE id = @id').get({ id }) as
    | RecordRow
    | undefined
}

// 목록 조회: 최신순(created_at DESC, id DESC)이 항상 끝까지 결정적이도록 id를 함께 정렬한다.
// rows와 total을 같은 읽기 트랜잭션에서 조회해 두 값이 같은 시점을 보게 한다
export function listRecords(query: ListRecordsQuery): ListRecordsResult {
  const db = getDb()
  const { conditions, params } = buildListClause(query)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return db.transaction(() => {
    const rows = db
      .prepare(
        `SELECT * FROM records ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({
        ...params,
        limit: query.limit,
        offset: query.offset,
      }) as RecordRow[]
    const total = db
      .prepare(`SELECT COUNT(*) FROM records ${where}`)
      .pluck()
      .get(params) as number
    return { rows, total }
  })()
}

// 보낸 키만 SET하고 updated_at을 갱신한다. 보낸 키가 없으면 현재 row를 그대로 반환한다.
// 수정 시에는 중복 검사를 하지 않는다 (ROADMAP Q9)
export function updateRecord(
  id: number,
  patch: UpdateRecordPatch
): RecordRow | undefined {
  const db = getDb()
  const columns = UPDATABLE_COLUMNS.filter(col =>
    Object.prototype.hasOwnProperty.call(patch, col)
  )
  if (columns.length === 0) {
    return findRecordById(id)
  }

  const now = nowKstIso()
  const setClause = columns.map(col => `${col} = @${col}`).join(', ')
  const params: Record<string, string | number | null> = { id, now }
  for (const col of columns) {
    params[col] = patch[col] ?? null
  }

  return db
    .prepare(
      `UPDATE records SET ${setClause}, updated_at = @now WHERE id = @id RETURNING *`
    )
    .get(params) as RecordRow | undefined
}

// 삭제된 row를 반환한다(파일 삭제는 호출 측(API 라우트)에서 이 반환값의 barcode_photo/product_photo/lighting_photo로 처리).
// 대상이 없으면 undefined
export function deleteRecord(id: number): RecordRow | undefined {
  return getDb()
    .prepare('DELETE FROM records WHERE id = @id RETURNING *')
    .get({ id }) as RecordRow | undefined
}

// 원본 바코드 중복 조회 (Phase 7 Task 025): raw_text를 toRawKey로 정규화한 값이 같은 기록을 찾는다.
// 직접 입력·빈 값은 판정 대상이 아니므로 undefined
export function findByRawText(rawText: string): RecordRow | undefined {
  const key = toRawKey(rawText)
  if (key === null) return undefined
  return getDb()
    .prepare('SELECT * FROM records WHERE raw_key = @key ORDER BY id LIMIT 1')
    .get({ key }) as RecordRow | undefined
}

// INSERT가 raw_key UNIQUE 인덱스에 걸렸는지 (동시 요청 경합 시)
export function isRawKeyConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' &&
    error.message.includes('raw_key')
  )
}

// Excel 내보내기용 목록: 스캔 순서(created_at ASC, id ASC)로 반환한다 (Q16).
// page를 주면 그 구간(파일 1개 분량)만 반환한다. 새 기록은 정렬상 뒤에 붙으므로 앞 구간은 밀리지 않는다
export function listRecordsForExport(
  from?: string,
  to?: string,
  page?: { limit: number; offset: number }
): RecordRow[] {
  const db = getDb()
  const { conditions, params } = buildRangeClause(from, to)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const paging = page ? 'LIMIT @limit OFFSET @offset' : ''
  return db
    .prepare(
      `SELECT * FROM records ${where} ORDER BY created_at ASC, id ASC ${paging}`
    )
    .all(page ? { ...params, ...page } : params) as RecordRow[]
}

// 기간 내 건수. 내보내기 전 경고 임계치·파일 분할 수·전체 상한 확인에 사용 (ROADMAP Q3·Q6)
export function countRecordsInRange(from?: string, to?: string): number {
  const db = getDb()
  const { conditions, params } = buildRangeClause(from, to)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return db
    .prepare(`SELECT COUNT(*) FROM records ${where}`)
    .pluck()
    .get(params) as number
}
