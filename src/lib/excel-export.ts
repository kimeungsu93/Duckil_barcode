// 서버 전용 - Excel(xlsx) 내보내기 워크북 생성 (exceljs 사용). 클라이언트 컴포넌트에서 import 금지
import 'server-only'
import ExcelJS from 'exceljs'
import { readJpegSize } from '@/lib/jpeg-size'
import { readPhoto } from '@/lib/storage'
import { formatKstDisplay } from '@/lib/time'
import type { RecordRow } from '@/lib/types/record'

// 사진 셀 고정 상자 크기(px, PRD F5): 가로 최대 240 · 세로 최대 90
const PHOTO_BOX_WIDTH_PX = 240
const PHOTO_BOX_HEIGHT_PX = 90

// 크기를 못 읽거나(SOF 없음) PNG일 때 쓰는 기본 상자 크기(px). 비율 정보가 없으므로 고정 상자 크기를 그대로 쓴다
const DEFAULT_PHOTO_EXT = {
  width: PHOTO_BOX_WIDTH_PX,
  height: PHOTO_BOX_HEIGHT_PX,
}

// 사진 열 너비(문자 단위): (px - 5) / 7 + 여유 3
const PHOTO_COLUMN_WIDTH = (PHOTO_BOX_WIDTH_PX - 5) / 7 + 3

// 사진이 들어가는 행의 높이(pt): px × 0.75 (90px → 67.5pt) 이상
const PHOTO_ROW_HEIGHT_PT = PHOTO_BOX_HEIGHT_PX * 0.75

// 헤더 열 정의 (PRD F5의 9개 컬럼. Phase 7 Task 026에서 9번째 '점등 사진' 추가)
const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'No', key: 'no', width: 6 },
  { header: '일시', key: 'created_at', width: 18 },
  { header: 'Product No', key: 'product_no', width: 18 },
  { header: 'Lot', key: 'lot', width: 14 },
  { header: 'QR 원문', key: 'raw_text', width: 24 },
  { header: '메모', key: 'memo', width: 20 },
  { header: '바코드 사진', key: 'barcode_photo', width: PHOTO_COLUMN_WIDTH },
  { header: '제품 사진', key: 'product_photo', width: PHOTO_COLUMN_WIDTH },
  { header: '점등 사진', key: 'lighting_photo', width: PHOTO_COLUMN_WIDTH },
]

// 사진 열의 1-based 열 번호 (헤더 정의 순서와 일치)
const BARCODE_PHOTO_COLUMN = 7
const PRODUCT_PHOTO_COLUMN = 8
const LIGHTING_PHOTO_COLUMN = 9

// JPEG/PNG 확장자(exceljs addImage용). readPhoto의 contentType과 1:1 대응
type ExcelImageExtension = 'jpeg' | 'png'

function toExcelExtension(
  contentType: 'image/jpeg' | 'image/png'
): ExcelImageExtension {
  return contentType === 'image/png' ? 'png' : 'jpeg'
}

// contain(비율 유지) 방식으로 고정 상자(240x90)에 맞춘 ext(px)를 계산한다
function computeContainExt(
  width: number,
  height: number
): { width: number; height: number } {
  const scale = Math.min(
    PHOTO_BOX_WIDTH_PX / width,
    PHOTO_BOX_HEIGHT_PX / height
  )
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

// 사진 파일명을 읽어 워크시트의 지정한 셀(1-based row/col)에 썸네일로 삽입한다.
// 파일이 없거나(readPhoto가 null) 파일명 자체가 비어 있으면 아무것도 하지 않아 셀이 빈 채로 남는다 (F5-5)
async function placePhoto(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  filename: string | null,
  rowNumber: number,
  columnNumber: number
): Promise<void> {
  if (!filename) return

  const photo = await readPhoto(filename)
  if (photo === null) return // 파일명이 유효하지 않거나 파일이 사라진 경우도 빈 셀로 둔다

  const { buffer, contentType } = photo
  const extension = toExcelExtension(contentType)

  // EXIF 회전 전제(PRD §8): 저장된 JPEG는 Task 015에서 EXIF 회전을 픽셀에 반영한 정방향이므로,
  // JPEG SOF 헤더의 가로·세로를 그대로 믿고 비율(contain)을 계산한다. 별도 Orientation 보정은 하지 않는다.
  const jpegSize = extension === 'jpeg' ? readJpegSize(buffer) : null
  const ext =
    jpegSize !== null
      ? computeContainExt(jpegSize.width, jpegSize.height)
      : DEFAULT_PHOTO_EXT

  // exceljs 타입 정의(구버전 @types/node 기준 비제네릭 Buffer)가 최신 @types/node의 제네릭
  // Buffer 클래스와 전역에서 선언 병합되며 구조적 할당 검사가 깨진다(unknown 경유 캐스트도 실패).
  // 런타임에는 동일한 Node Buffer이므로 이 지점만 any로 타입 충돌을 우회한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageId = workbook.addImage({ buffer: buffer as any, extension })
  worksheet.addImage(imageId, {
    tl: { col: columnNumber - 1, row: rowNumber - 1 },
    ext,
    editAs: 'oneCell',
  })
}

// records-repo에서 스캔 순서(created_at ASC, id ASC)로 조회한 rows를 받아 xlsx 워크북 버퍼를 만든다.
// No는 DB id가 아니라 rows 배열 안 순번(1부터)이므로, 호출 측이 이미 스캔 순서로 정렬해 넘겨야 한다 (Q16)
export async function buildExportWorkbook(rows: RecordRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('기록')
  worksheet.columns = COLUMNS

  // 헤더 행 스타일: 굵게, 배경색, 테두리, 가운데 정렬 (F5-7)
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell(cell => {
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  for (let i = 0; i < rows.length; i++) {
    const record = rows[i]
    const rowNumber = i + 2 // 1행은 헤더

    worksheet.addRow({
      no: i + 1,
      created_at: formatKstDisplay(record.created_at),
      product_no: record.product_no,
      lot: record.lot,
      raw_text: record.raw_text,
      memo: record.memo ?? '',
    })

    // 사진이 들어갈 수 있는 행은 미리 높이를 확보해둔다 (67.5pt 이상)
    worksheet.getRow(rowNumber).height = PHOTO_ROW_HEIGHT_PT

    await placePhoto(
      workbook,
      worksheet,
      record.barcode_photo,
      rowNumber,
      BARCODE_PHOTO_COLUMN
    )
    await placePhoto(
      workbook,
      worksheet,
      record.product_photo,
      rowNumber,
      PRODUCT_PHOTO_COLUMN
    )
    await placePhoto(
      workbook,
      worksheet,
      record.lighting_photo,
      rowNumber,
      LIGHTING_PHOTO_COLUMN
    )
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  // exceljs의 번들 타입 정의(@types/node ^14 기준)가 최신 @types/node의 제네릭 Buffer와
  // 전역 선언 병합 시 충돌해 구조적 할당이 막히므로, 실제로는 동일한 런타임 Buffer이기 때문에
  // unknown을 경유해 타입만 정리한다
  return Buffer.from(arrayBuffer as unknown as ArrayBuffer) as unknown as Buffer
}
