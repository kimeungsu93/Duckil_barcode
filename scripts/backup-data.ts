// 데이터 백업 스크립트 (ROADMAP Phase 6 Task 023)
// DATA_DIR의 app.db를 SQLite 온라인 백업으로 떠내고, 백업본 DB가 가리키는 사진만 uploads/로 복사한다.
// WAL 모드라 app.db 파일을 그냥 복사하면 -wal 파일에만 있는 최근 변경이 빠질 수 있으므로
// 반드시 better-sqlite3의 backup()을 쓴다 (서버가 실행 중이어도 안전).
//
// 사진을 "백업본 DB 기준"으로 고르는 이유: DB를 떠낸 뒤 uploads/ 전체를 복사하면 그 사이에
// 추가·삭제된 사진 때문에 백업본의 DB와 파일이 어긋날 수 있다. 백업본 DB가 가리키는 파일만 복사하면
// 백업 폴더 자체가 그대로 DATA_DIR로 쓸 수 있는 일관된 상태가 된다.
//
// 사용법:
//   DATA_DIR=/srv/duckil-barcode/data node --import ./scripts/register-alias.mjs scripts/backup-data.ts [대상 폴더]
//
// 대상 폴더를 생략하면 DATA_DIR와 같은 위치의 backups/YYYYMMDD-HHmmss(KST)에 만든다.
// 복원: 백업 폴더(app.db + uploads/)를 새 DATA_DIR로 복사하고 서버를 그 경로로 실행한다.
//
// exit code:
//   0  백업 완료
//   1  백업은 만들었지만 백업본 DB가 가리키는 사진 중 원본에 없는 파일이 있음 (경고 목록 출력)
//   2  DATA_DIR/app.db가 없거나 백업에 실패함
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { env, UPLOAD_DIR } from '@/lib/env'
import { nowKstIso } from '@/lib/time'

// '2026-09-30T06:40:12+09:00' → '20260930-064012'
function kstStamp(): string {
  const iso = nowKstIso()
  return `${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 19).replaceAll(':', '')}`
}

async function main(): Promise<number> {
  const dataDir = path.resolve(env.DATA_DIR)
  const dbPath = path.join(dataDir, 'app.db')
  if (!existsSync(dbPath)) {
    console.error(`DB 파일이 없습니다: ${dbPath}`)
    return 2
  }

  const target = path.resolve(
    process.argv[2] ?? path.join(path.dirname(dataDir), 'backups', kstStamp())
  )
  if (existsSync(target) && readdirSync(target).length > 0) {
    console.error(`대상 폴더가 비어 있지 않습니다: ${target}`)
    return 2
  }
  const targetUploads = path.join(target, 'uploads')
  mkdirSync(targetUploads, { recursive: true })

  // 1) DB 온라인 백업. 원본은 읽기 전용으로 연다 (getDb()는 마이그레이션·폴더 생성을 하므로 쓰지 않는다)
  const source = new Database(dbPath, { readonly: true, fileMustExist: true })
  const targetDb = path.join(target, 'app.db')
  try {
    await source.backup(targetDb)
  } finally {
    source.close()
  }

  // 2) 백업본 DB가 가리키는 사진 파일명을 모은다
  const backup = new Database(targetDb, { readonly: true, fileMustExist: true })
  let recordCount: number
  const photos = new Set<string>()
  try {
    recordCount = (
      backup.prepare('SELECT COUNT(*) AS count FROM records').get() as {
        count: number
      }
    ).count
    const rows = backup
      .prepare(
        'SELECT barcode_photo, product_photo, lighting_photo FROM records'
      )
      .all() as {
      barcode_photo: string | null
      product_photo: string | null
      lighting_photo: string | null
    }[]
    for (const row of rows) {
      if (row.barcode_photo) photos.add(row.barcode_photo)
      if (row.product_photo) photos.add(row.product_photo)
      if (row.lighting_photo) photos.add(row.lighting_photo)
    }
  } finally {
    backup.close()
  }
  // 백업본도 WAL 모드라 읽기 전용으로 열면 빈 -wal·-shm 파일이 생긴다. 내용이 없으면 지워 app.db 하나만 남긴다
  const walPath = `${targetDb}-wal`
  if (existsSync(walPath) && statSync(walPath).size === 0) {
    rmSync(walPath)
    rmSync(`${targetDb}-shm`, { force: true })
  }

  // 3) 사진 복사. 원본에 없는 파일은 경고로만 남긴다 (백업 도중 삭제되었거나 원래부터 고아 레코드)
  const missing: string[] = []
  let copied = 0
  for (const filename of photos) {
    const from = path.join(UPLOAD_DIR, filename)
    if (!existsSync(from)) {
      missing.push(filename)
      continue
    }
    copyFileSync(from, path.join(targetUploads, filename))
    copied++
  }

  console.log('=== 데이터 백업 ===')
  console.log(`원본 DATA_DIR: ${dataDir}`)
  console.log(`백업 폴더: ${target}`)
  console.log(`기록 수: ${recordCount}`)
  console.log(`사진: ${copied}/${photos.size}개 복사`)
  if (missing.length > 0) {
    console.log(`\n원본에 없는 사진 ${missing.length}개:`)
    for (const filename of missing) console.log(`- ${filename}`)
    return 1
  }
  console.log('\n백업 완료')
  return 0
}

main()
  .then(code => process.exit(code))
  .catch((error: unknown) => {
    console.error('백업 실패:', error)
    process.exit(2)
  })
