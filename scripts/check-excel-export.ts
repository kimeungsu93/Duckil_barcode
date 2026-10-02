// excel-export.ts 검증 스크립트 (Node 24 타입 스트리핑)
// DATA_DIR를 스크래치 임시 폴더로 지정한 뒤 실행해야 한다(스토리지가 실제 파일에 접근하므로).
// 실행 예:
//   DATA_DIR=/path/to/scratch/export-check node --import ./scripts/register-alias.mjs scripts/check-excel-export.ts
import { randomUUID } from 'node:crypto'
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { buildExportWorkbook } from '@/lib/excel-export'
import type { RecordRow } from '@/lib/types/record'

let failCount = 0

function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`)
  if (!ok) failCount++
}

async function main() {
  if (!process.env.DATA_DIR) {
    throw new Error(
      'DATA_DIR 환경변수를 스크래치 임시 폴더로 지정한 뒤 실행하세요'
    )
  }
  const dataDir = path.resolve(process.env.DATA_DIR)
  const uploadDir = path.join(dataDir, 'uploads')
  await mkdir(uploadDir, { recursive: true })

  const mockDir = path.resolve(process.cwd(), 'public/mock')

  // 3:1 비율 샘플(800x267)과 5:1 비율 샘플(800x160)을 uuid.jpg로 복사
  const barcodeUuid = `${randomUUID()}.jpg`
  const productUuid = `${randomUUID()}.jpg`
  await copyFile(
    path.join(mockDir, 'barcode-sample.jpg'),
    path.join(uploadDir, barcodeUuid)
  )
  await copyFile(
    path.join(mockDir, 'product-sample.jpg'),
    path.join(uploadDir, productUuid)
  )

  // 파일이 없는 사진(유효한 uuid.jpg 패턴이지만 실제 파일 없음)
  const missingUuid = `${randomUUID()}.jpg`

  const now = '2026-09-29T09:00:00+09:00'
  const rows: RecordRow[] = [
    {
      id: 101,
      raw_text: 'RAW-1',
      product_no: 'P-1',
      lot: 'L-1',
      memo: '바코드 사진(3:1)만 있음',
      barcode_photo: barcodeUuid,
      product_photo: null,
      lighting_photo: null,
      raw_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 102,
      raw_text: 'RAW-2',
      product_no: 'P-2',
      lot: 'L-2',
      memo: '제품 사진(5:1) + 점등 사진(3:1)',
      barcode_photo: null,
      product_photo: productUuid,
      lighting_photo: barcodeUuid,
      raw_key: 'RAW-2',
      created_at: now,
      updated_at: now,
    },
    {
      id: 103,
      raw_text: 'RAW-3',
      product_no: 'P-3',
      lot: 'L-3',
      memo: null,
      barcode_photo: null,
      product_photo: null,
      lighting_photo: null,
      raw_key: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 104,
      raw_text: 'RAW-4',
      product_no: 'P-4',
      lot: 'L-4',
      memo: '파일이 사라진 경우',
      barcode_photo: missingUuid,
      product_photo: null,
      lighting_photo: null,
      raw_key: null,
      created_at: now,
      updated_at: now,
    },
  ]

  const buffer = await buildExportWorkbook(rows)

  const readback = new ExcelJS.Workbook()
  // exceljs 타입 정의(구버전 @types/node 기준 비제네릭 Buffer)가 최신 @types/node의 제네릭
  // Buffer 클래스와 전역에서 선언 병합되며 구조적 할당 검사가 깨진다(unknown 경유 캐스트도 실패).
  // 런타임에는 동일한 Node Buffer이므로 이 지점만 any로 타입 충돌을 우회한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await readback.xlsx.load(buffer as any)
  const worksheet = readback.worksheets[0]

  // 행 수: 헤더 1 + 데이터 4
  check(
    '행 수',
    worksheet.rowCount === rows.length + 1,
    `rowCount=${worksheet.rowCount}`
  )

  // No 순번(1~4)이 배열 순서대로 매겨졌는지
  const noValues = rows.map((_, i) => worksheet.getCell(`A${i + 2}`).value)
  check(
    'No 순번',
    JSON.stringify(noValues) === JSON.stringify([1, 2, 3, 4]),
    JSON.stringify(noValues)
  )

  // 헤더 9개 컬럼, 9번째는 점등 사진 (Phase 7 Task 026)
  check(
    '9번째 헤더 = 점등 사진',
    worksheet.getCell(1, 9).value === '점등 사진',
    String(worksheet.getCell(1, 9).value)
  )

  // 헤더 스타일: 굵게·배경색·테두리·가운데 정렬 (9개 컬럼 전부)
  let headerStyleOk = true
  for (let col = 1; col <= 9; col++) {
    const cell = worksheet.getCell(1, col)
    if (
      cell.font?.bold !== true ||
      cell.fill?.type !== 'pattern' ||
      !cell.border?.top ||
      !cell.border?.bottom ||
      !cell.border?.left ||
      !cell.border?.right ||
      cell.alignment?.horizontal !== 'center' ||
      cell.alignment?.vertical !== 'middle'
    ) {
      headerStyleOk = false
    }
  }
  check('헤더 스타일(굵게·배경·테두리·가운데정렬)', headerStyleOk)

  // 이미지 개수: barcode(행2) + product·lighting(행3) = 3. 행4(사진 없음)·행5(파일 없음)는 이미지가 없어야 한다
  const images = worksheet.getImages()
  check('이미지 개수', images.length === 3, `count=${images.length}`)

  // 각 이미지가 240x90 상자를 넘지 않고, 원본 비율과 1% 이내로 일치하는지
  const expectations = [
    {
      nativeRow: 1,
      nativeCol: 6,
      width: 800,
      height: 267,
      label: '바코드 사진(3:1, row2)',
    }, // 0-based: row=1(2행), col=6(7번째 열)
    {
      nativeRow: 2,
      nativeCol: 7,
      width: 800,
      height: 160,
      label: '제품 사진(5:1, row3)',
    }, // row=2(3행), col=7(8번째 열)
    {
      nativeRow: 2,
      nativeCol: 8,
      width: 800,
      height: 267,
      label: '점등 사진(3:1, row3)',
    }, // row=2(3행), col=8(9번째 열)
  ]

  for (const exp of expectations) {
    const found = images.find(
      img =>
        img.range.tl.nativeRow === exp.nativeRow &&
        img.range.tl.nativeCol === exp.nativeCol
    )
    if (!found) {
      check(`${exp.label} 배치`, false, '해당 위치에 이미지 없음')
      continue
    }
    // exceljs의 ImageRange 타입 정의는 twoCellAnchor(tl/br) 기준이라 ext를 선언하지 않지만,
    // editAs:'oneCell'로 삽입한 이미지는 oneCellAnchor로 저장되어 range.ext(px)가 실제로 채워진다
    const range = found.range as unknown as {
      ext: { width: number; height: number }
    }
    const ext = range.ext
    const withinBox = ext.width <= 240 && ext.height <= 90
    const originalRatio = exp.width / exp.height
    const actualRatio = ext.width / ext.height
    const ratioDiff = Math.abs(actualRatio - originalRatio) / originalRatio
    check(
      `${exp.label} 상자 크기(≤240x90)`,
      withinBox,
      `ext=${ext.width}x${ext.height}`
    )
    check(
      `${exp.label} 비율 유지(오차 1% 이내)`,
      ratioDiff <= 0.01,
      `원본비율=${originalRatio.toFixed(4)} 실제비율=${actualRatio.toFixed(4)} 오차=${(ratioDiff * 100).toFixed(2)}%`
    )
  }

  // 사진 없는 행(4행=데이터 row3)과 파일 없는 행(5행=데이터 row4)에는 이미지가 없어야 한다
  const noPhotoRowHasImage = images.some(
    img => img.range.tl.nativeRow === 3 || img.range.tl.nativeRow === 4
  )
  check('사진 없음/파일 없음 행은 빈 셀(이미지 없음)', !noPhotoRowHasImage)

  console.log(failCount === 0 ? '\n모든 검증 통과' : `\n${failCount}건 실패`)
  if (failCount > 0) process.exitCode = 1
}

main()
