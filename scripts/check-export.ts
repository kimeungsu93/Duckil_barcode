// GET /api/export가 반환한 xlsx 파일을 exceljs로 재읽기해 검증하는 스크립트.
// 행 수·이미지 수·No 순번·헤더 스타일과, 각 이미지가 240x90 상자를 넘지 않고
// 원본(임베드된 버퍼) 비율을 1% 이내로 유지하는지(JPEG SOF 기준) 확인한다.
// PNG 등 비JPEG나 SOF를 못 찾는 JPEG는 기본 상자 크기(240x90) 그대로인지만 확인한다.
//
// 실행 예:
//   node --import ./scripts/register-alias.mjs scripts/check-export.ts <xlsx-path> [--rows=N] [--images=N]
import { readFile } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { readJpegSize } from '@/lib/jpeg-size'

const PHOTO_BOX_WIDTH_PX = 240
const PHOTO_BOX_HEIGHT_PX = 90

let failCount = 0

function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`)
  if (!ok) failCount++
}

// --key=value 형태의 옵션 인자를 Map으로 파싱한다
function parseFlags(args: string[]): Map<string, string> {
  const flags = new Map<string, string>()
  for (const arg of args) {
    if (!arg.startsWith('--')) continue
    const [key, value = ''] = arg.slice(2).split('=')
    flags.set(key, value)
  }
  return flags
}

async function main() {
  const [, , filePath, ...rest] = process.argv
  if (!filePath) {
    throw new Error(
      '사용법: check-export.ts <xlsx-path> [--rows=N] [--images=N]'
    )
  }
  const flags = parseFlags(rest)
  const expectRows = flags.has('rows') ? Number(flags.get('rows')) : undefined
  const expectImages = flags.has('images')
    ? Number(flags.get('images'))
    : undefined

  const buffer = await readFile(filePath)
  const workbook = new ExcelJS.Workbook()
  // exceljs 타입 정의(구버전 @types/node 기준 비제네릭 Buffer)가 최신 @types/node의 제네릭
  // Buffer 클래스와 전역에서 선언 병합되며 구조적 할당 검사가 깨진다. 런타임에는 동일한
  // Node Buffer이므로 이 지점만 any로 타입 충돌을 우회한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  // 행 수(헤더 제외)
  const dataRowCount = worksheet.rowCount - 1
  console.log(`행 수(헤더 제외): ${dataRowCount}`)
  if (expectRows !== undefined) {
    check(
      '행 수 일치',
      dataRowCount === expectRows,
      `실제=${dataRowCount} 기대=${expectRows}`
    )
  }

  // No 순번: 2행부터 1,2,3...이 순서대로 매겨졌는지 (F5-6)
  let noOk = true
  const noValues: unknown[] = []
  for (let i = 0; i < dataRowCount; i++) {
    const value = worksheet.getCell(`A${i + 2}`).value
    noValues.push(value)
    if (value !== i + 1) noOk = false
  }
  check('No 순번(1부터 이어짐)', noOk, JSON.stringify(noValues))

  // 헤더 행 스타일: 굵게·배경색·테두리·가운데 정렬 (8개 컬럼 전부, F5-7)
  let headerStyleOk = true
  for (let col = 1; col <= 8; col++) {
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

  // 이미지 검사
  const images = worksheet.getImages()
  console.log(`이미지 수: ${images.length}`)
  if (expectImages !== undefined) {
    check(
      '이미지 수 일치',
      images.length === expectImages,
      `실제=${images.length} 기대=${expectImages}`
    )
  }

  for (const img of images) {
    const media = workbook.model.media[Number(img.imageId)]
    // exceljs의 ImageRange 타입 정의는 twoCellAnchor(tl/br) 기준이라 ext를 선언하지 않지만,
    // editAs:'oneCell'로 삽입한 이미지는 oneCellAnchor로 저장되어 range.ext(px)가 채워진다
    const range = img.range as unknown as {
      ext?: { width: number; height: number }
      tl: { nativeRow: number; nativeCol: number }
    }
    const ext = range.ext
    const label = `행${range.tl.nativeRow + 1} 열${range.tl.nativeCol + 1}`

    if (!ext) {
      check(`${label} 배치 정보(ext)`, false, 'oneCellAnchor ext 없음')
      continue
    }

    const withinBox =
      ext.width <= PHOTO_BOX_WIDTH_PX && ext.height <= PHOTO_BOX_HEIGHT_PX
    check(
      `${label} 상자 크기(≤240x90)`,
      withinBox,
      `ext=${ext.width}x${ext.height}`
    )

    const isDefaultBox =
      ext.width === PHOTO_BOX_WIDTH_PX && ext.height === PHOTO_BOX_HEIGHT_PX
    // media.buffer는 exceljs 번들 타입 정의(구버전 @types/node 기준)의 Buffer라 최신
    // @types/node의 제네릭 Buffer와 구조적으로 어긋난다. 런타임에는 동일한 Node Buffer이므로
    // 이 지점만 unknown을 경유해 타입을 정리한다
    const original =
      media?.extension === 'jpeg'
        ? readJpegSize(media.buffer as unknown as Buffer)
        : null

    if (original !== null) {
      const originalRatio = original.width / original.height
      const actualRatio = ext.width / ext.height
      const ratioDiff = Math.abs(actualRatio - originalRatio) / originalRatio
      check(
        `${label} 비율 유지(오차 1% 이내)`,
        ratioDiff <= 0.01,
        `원본=${original.width}x${original.height}(비율${originalRatio.toFixed(4)}) 실제=${ext.width}x${ext.height}(비율${actualRatio.toFixed(4)}) 오차=${(ratioDiff * 100).toFixed(2)}%`
      )
    } else {
      // PNG 등 비JPEG이거나 SOF를 못 찾은 JPEG: 기본 상자 크기(240x90) 그대로여야 한다
      check(
        `${label} 기본 상자 크기(비JPEG 또는 SOF 없음)`,
        isDefaultBox,
        `ext=${ext.width}x${ext.height}`
      )
    }
  }

  console.log(failCount === 0 ? '\n모든 검증 통과' : `\n${failCount}건 실패`)
  if (failCount > 0) process.exitCode = 1
}

main()
