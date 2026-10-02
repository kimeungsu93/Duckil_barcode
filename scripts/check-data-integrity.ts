// 데이터 정합성 검사 스크립트 (ROADMAP Phase 5 Task 020)
// data/uploads/의 파일 목록과 DB(records.barcode_photo, records.product_photo, records.lighting_photo)가
// 정확히 일치하는지 확인한다: 고아 파일(어떤 row도 가리키지 않는 파일)과
// 고아 레코드(row가 가리키지만 실제 파일이 없는 경우)가 하나도 없어야 통과.
//
// 읽기 전용: DB는 better-sqlite3를 { readonly: true, fileMustExist: true }로 직접 열고
// (getDb()는 빈 폴더에 DB를 새로 만들어버리므로 쓰지 않는다), 파일도 읽기만 한다.
// WAL 모드에서도 읽기는 쓰기와 서로 막지 않으므로 dev 서버가 같은 DB를 쓰는 중에도 안전하다.
//
// 사용법:
//   node --import ./scripts/register-alias.mjs scripts/check-data-integrity.ts [--json]
//
// 옵션:
//   --json   결과를 JSON으로 stdout에 출력한다 (테스트 자동화용). 경고는 stderr로 보낸다.
//
// exit code:
//   0  기록·파일이 모두 일치
//   1  고아 파일 또는 고아 레코드가 있음
//   2  DATA_DIR/app.db가 없거나 DB를 열 수 없음
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { env, UPLOAD_DIR } from '@/lib/env'
import { PHOTO_FILENAME_PATTERN } from '@/lib/schemas/photo'
import type { RecordRow } from '@/lib/types/record'

// uploads에 있지만 어떤 row도 가리키지 않는 파일
interface OrphanFile {
  filename: string
  // PHOTO_FILENAME_PATTERN(uuid.jpg)에 맞지 않는 파일인지 여부.
  // .DS_Store 같은 OS 메타데이터·임시 파일은 storage.ts의 savePhoto()가 절대 만들 수 없는
  // 이름이라 애플리케이션 로직상의 "고아"와 원인이 다르다. 그래도 "정확히 일치"라는
  // 완료 조건(ROADMAP Task 020)은 uploads 디렉토리 자체의 내용 기준이므로, 이런 파일도
  // 고아 파일 집계에는 포함하되 patternMismatch로 구분해 원인을 바로 알 수 있게 한다.
  patternMismatch: boolean
}

// DB row가 가리키지만 uploads에 실제 파일이 없는 경우
interface OrphanRecord {
  id: number
  field: 'barcode_photo' | 'product_photo' | 'lighting_photo'
  filename: string
}

interface IntegrityResult {
  dataDir: string
  dbPath: string
  uploadDir: string
  recordCount: number
  photoRefCount: number
  uploadFileCount: number
  orphanFiles: OrphanFile[]
  orphanRecords: OrphanRecord[]
  ok: boolean
}

const jsonOutput = process.argv.slice(2).includes('--json')

// --json이면 사람이 읽는 로그를 stderr로 보내 stdout에는 JSON만 남긴다
function log(message: string): void {
  if (jsonOutput) {
    console.error(message)
  } else {
    console.log(message)
  }
}

const dbPath = path.join(env.DATA_DIR, 'app.db')

log('=== 데이터 정합성 검사 ===')
log(`DATA_DIR: ${env.DATA_DIR}`)
log(`DB: ${dbPath}`)
log(`uploads: ${UPLOAD_DIR}`)

// 실제 data/ 오염 방지: 읽기 전용이라 막을 필요는 없지만, 값을 알 수 있게 경고만 남긴다
const resolvedDataDir = path.resolve(env.DATA_DIR)
const projectDataDir = path.resolve(process.cwd(), 'data')
if (!process.env.DATA_DIR || resolvedDataDir === projectDataDir) {
  log(
    '[경고] DATA_DIR가 지정되지 않았거나 프로젝트 ./data를 가리킵니다. ' +
      '실제 운영 데이터를 대상으로 검사합니다 (읽기 전용이므로 변경하지 않습니다).'
  )
}

// DB 파일이 없으면 getDb()처럼 새로 만들지 않고 "DB 없음"으로 안내하고 종료한다.
// 빈 스크래치 폴더에서 이 스크립트를 실행했을 때 DB를 새로 만들어버리면
// "무엇과 비교했는지"가 불분명해져 검사 자체가 무의미해진다.
if (!existsSync(dbPath)) {
  log(`DB 파일이 없습니다: ${dbPath}`)
  log('먼저 앱을 실행해 기록을 만들거나, 올바른 DATA_DIR을 지정하세요.')
  process.exit(2)
}

let db: Database.Database
try {
  // readonly + fileMustExist: 쓰기를 아예 막고, 없는 파일이면 새로 만들지 않고 예외를 던진다.
  // WAL 상태(app.db-wal, app.db-shm)에서도 읽기 전용 연결로 안전하게 최신 커밋을 읽을 수 있다.
  db = new Database(dbPath, { readonly: true, fileMustExist: true })
  // query_only는 연결 단위 설정으로, 실수로 쓰기 SQL을 실행하는 경우를 한 번 더 막는 안전장치다
  // (readonly 연결은 이미 쓰기 statement를 prepare 단계에서 거부하므로 없어도 안전하지만 이중 방어한다)
  db.pragma('query_only = ON')
} catch (error) {
  log(`DB를 열 수 없습니다: ${(error as Error).message}`)
  process.exit(2)
}

// ── 1. DB에서 사진 참조 수집 ───────────────────────────────────────────
const rows = db
  .prepare(
    'SELECT id, barcode_photo, product_photo, lighting_photo FROM records'
  )
  .all() as Pick<
  RecordRow,
  'id' | 'barcode_photo' | 'product_photo' | 'lighting_photo'
>[]

const photoFields = [
  'barcode_photo',
  'product_photo',
  'lighting_photo',
] as const
type PhotoField = (typeof photoFields)[number]

// 파일명 → 참조한 row id 목록 (한 파일을 여러 row가 가리키는 경우는 없어야 정상이지만,
// 있어도 고아 판정에는 영향이 없으므로 Set으로만 존재 여부를 본다)
const referencedFilenames = new Set<string>()
let photoRefCount = 0
const orphanRecords: OrphanRecord[] = []

for (const row of rows) {
  for (const field of photoFields) {
    const filename = row[field as PhotoField]
    if (filename === null) continue
    photoRefCount += 1
    referencedFilenames.add(filename)
    const filePath = path.join(UPLOAD_DIR, filename)
    if (!existsSync(filePath)) {
      orphanRecords.push({ id: row.id, field: field as PhotoField, filename })
    }
  }
}

// ── 2. uploads 디렉토리 파일과 대조 ────────────────────────────────────
let uploadFilenames: string[] = []
if (existsSync(UPLOAD_DIR)) {
  uploadFilenames = readdirSync(UPLOAD_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
} else {
  log(`[경고] uploads 폴더가 없습니다: ${UPLOAD_DIR} (파일 0개로 간주)`)
}

const orphanFiles: OrphanFile[] = []
for (const filename of uploadFilenames) {
  if (referencedFilenames.has(filename)) continue
  orphanFiles.push({
    filename,
    patternMismatch: !PHOTO_FILENAME_PATTERN.test(filename),
  })
}

db.close()

// ── 3. 결과 정리 ───────────────────────────────────────────────────────
const result: IntegrityResult = {
  dataDir: env.DATA_DIR,
  dbPath,
  uploadDir: UPLOAD_DIR,
  recordCount: rows.length,
  photoRefCount,
  uploadFileCount: uploadFilenames.length,
  orphanFiles,
  orphanRecords,
  ok: orphanFiles.length === 0 && orphanRecords.length === 0,
}

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2))
} else {
  const patternMismatchCount = orphanFiles.filter(f => f.patternMismatch).length
  console.log('\n--- 요약 ---')
  console.log(`기록 수(records): ${result.recordCount}`)
  console.log(
    `사진 참조 수(barcode_photo+product_photo+lighting_photo, NULL 제외): ${result.photoRefCount}`
  )
  console.log(`uploads 파일 수: ${result.uploadFileCount}`)
  console.log(
    `고아 파일 수: ${orphanFiles.length}${patternMismatchCount > 0 ? ` (그중 패턴 불일치 ${patternMismatchCount}개)` : ''}`
  )
  console.log(`고아 레코드 수: ${orphanRecords.length}`)

  if (orphanFiles.length > 0) {
    console.log('\n--- 고아 파일 (uploads에는 있지만 DB가 가리키지 않음) ---')
    for (const f of orphanFiles) {
      console.log(
        `- ${f.filename}${f.patternMismatch ? '  [패턴 불일치: PHOTO_FILENAME_PATTERN 아님]' : ''}`
      )
    }
  }

  if (orphanRecords.length > 0) {
    console.log('\n--- 고아 레코드 (DB는 가리키지만 uploads에 파일 없음) ---')
    for (const r of orphanRecords) {
      console.log(`- id=${r.id} ${r.field}=${r.filename} (파일 없음)`)
    }
  }

  console.log(
    result.ok
      ? '\n=== 결과: 모두 일치 (exit 0) ==='
      : '\n=== 결과: 불일치 있음 (exit 1) ==='
  )
}

process.exit(result.ok ? 0 : 1)
