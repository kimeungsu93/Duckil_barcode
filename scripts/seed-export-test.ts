// Task 012-B 테스트용 DB 직접 삽입 스크립트. records-repo를 거치지 않고 created_at을
// 원하는 값으로 고정해 넣어야 하는 시나리오(대량 생성, KST 경계, 생성 순서)에 사용한다.
// dev 서버와 같은 DATA_DIR을 가리켜야 같은 DB 파일에 기록된다 (WAL 모드라 동시 접근 가능).
//
// 실행 예:
//   DATA_DIR=<dev 서버와 동일 폴더> node --import ./scripts/register-alias.mjs scripts/seed-export-test.ts many 2099-01-01 501
//   DATA_DIR=<...> node --import ./scripts/register-alias.mjs scripts/seed-export-test.ts boundary 2021-02-10 2021-02-11
//   DATA_DIR=<...> node --import ./scripts/register-alias.mjs scripts/seed-export-test.ts lots 2021-03-01
import { getDb } from '@/lib/db'

function insertAt(createdAt: string, productNo: string, lot: string): number {
  const info = getDb()
    .prepare(
      `INSERT INTO records (raw_text, product_no, lot, memo, barcode_photo, product_photo, created_at, updated_at)
       VALUES (@raw_text, @product_no, @lot, NULL, NULL, NULL, @created_at, @created_at)`
    )
    .run({
      raw_text: `SEED-${productNo}`,
      product_no: productNo,
      lot,
      created_at: createdAt,
    })
  return Number(info.lastInsertRowid)
}

function seedMany(date: string, count: number): void {
  const createdAt = `${date}T12:00:00+09:00`
  for (let i = 0; i < count; i++) {
    insertAt(createdAt, `MANY-${date}-${i}`, `LOT-${i}`)
  }
  console.log(`many: ${date}에 ${count}건 삽입 완료 (사진 없음)`)
}

function seedBoundary(day1: string, day2: string): void {
  const lastMoment = `${day1}T23:59:59+09:00`
  const firstMomentNext = `${day2}T00:00:00+09:00`
  insertAt(lastMoment, `BOUND-LAST-${day1}`, 'BOUND')
  insertAt(firstMomentNext, `BOUND-FIRST-${day2}`, 'BOUND')
  console.log(
    `boundary: ${day1} 23:59:59 → BOUND-LAST-${day1}, ${day2} 00:00:00 → BOUND-FIRST-${day2} 삽입 완료`
  )
}

function seedLots(date: string): void {
  const lots = ['2608200040', '2608200041', '2608200044', '2608200042']
  const ids: number[] = []
  for (let i = 0; i < lots.length; i++) {
    // 초 단위를 다르게 주어 같은 날짜 안에서도 삽입 순서대로 created_at이 증가하게 한다
    const createdAt = `${date}T09:00:0${i}+09:00`
    ids.push(insertAt(createdAt, `LOTORDER-${date}`, lots[i]))
  }
  console.log(
    `lots: ${date}에 Lot ${lots.join(' → ')} 순서로 삽입 완료 (id: ${ids.join(', ')})`
  )
}

function main() {
  const [, , command, ...args] = process.argv
  switch (command) {
    case 'many': {
      const [date, countStr] = args
      if (!date || !countStr) throw new Error('사용법: many <date> <count>')
      seedMany(date, Number(countStr))
      break
    }
    case 'boundary': {
      const [day1, day2] = args
      if (!day1 || !day2) throw new Error('사용법: boundary <day1> <day2>')
      seedBoundary(day1, day2)
      break
    }
    case 'lots': {
      const [date] = args
      if (!date) throw new Error('사용법: lots <date>')
      seedLots(date)
      break
    }
    default:
      throw new Error('사용법: seed-export-test.ts <many|boundary|lots> ...')
  }
}

main()
