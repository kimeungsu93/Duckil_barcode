// 서버 전용 - SQLite 연결 초기화 및 스키마 마이그레이션 (PRD §6, §7, §8)
import 'server-only'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { env, UPLOAD_DIR } from '@/lib/env'

type Db = Database.Database

// 개발 모드 HMR에서 연결이 여러 개 생기지 않도록 globalThis에 싱글턴으로 보관한다
const globalForDb = globalThis as unknown as { __duckilDb?: Db }

// 배열 인덱스 i의 함수가 스키마를 버전 i → i+1로 올린다.
// 이미 배포된 단계는 절대 수정하지 않고, 컬럼 추가 등 변경이 필요하면 새 단계를 뒤에 추가한다.
const MIGRATIONS: ((db: Db) => void)[] = [
  // v0 → v1: records 테이블과 인덱스 생성 (PRD §6)
  db =>
    db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_text      TEXT NOT NULL,
        product_no    TEXT NOT NULL,
        lot           TEXT NOT NULL,
        memo          TEXT,
        barcode_photo TEXT,
        product_photo TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at);
      CREATE INDEX IF NOT EXISTS idx_records_product_lot ON records(product_no, lot);
    `),
]

// user_version을 읽어 현재 버전 이후 단계만 순서대로 적용한다.
// 각 단계는 트랜잭션 하나로 묶어 중간 실패 시 해당 단계만 롤백된다.
function migrate(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let version = current; version < MIGRATIONS.length; version++) {
    const step = MIGRATIONS[version]
    db.transaction(() => {
      step(db)
      // PRAGMA는 바인딩 파라미터를 지원하지 않아 숫자 리터럴을 직접 넣는다 (외부 입력 아님)
      db.pragma(`user_version = ${version + 1}`)
    }).immediate()
  }
}

// 처음 호출할 때만 DB를 연다. import 시점에 열면 next build가 data/app.db를 만들어버린다 (지연 초기화)
export function getDb(): Db {
  if (globalForDb.__duckilDb) return globalForDb.__duckilDb

  mkdirSync(env.DATA_DIR, { recursive: true })
  mkdirSync(UPLOAD_DIR, { recursive: true })

  const db = new Database(path.join(env.DATA_DIR, 'app.db'))
  // 읽기·쓰기가 서로 막지 않게 WAL 모드 사용 (DB 파일에 영구 저장됨)
  db.pragma('journal_mode = WAL')
  // 연결마다 설정해야 하는 보안 권고 (sqlite.org security)
  db.pragma('trusted_schema = OFF')
  // synchronous는 기본값 FULL을 유지한다 (업무 데이터라 기록 유실을 허용하지 않음)

  migrate(db)

  globalForDb.__duckilDb = db
  return db
}
