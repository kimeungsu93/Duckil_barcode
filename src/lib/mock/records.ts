// Phase 2 화면 개발용 더미 데이터. API를 호출하지 않고 화면을 채울 때만 사용한다
import { MANUAL_RAW_TEXT } from '@/lib/constants'
import type { RecordDto } from '@/lib/types/record'

export type MockPhotoKind = 'barcode' | 'product'

// 더미 사진 파일명(uuid.jpg)을 public/mock/ 샘플 이미지 경로로 바꾼다
export function mockPhotoUrl(
  filename: string | null,
  kind: MockPhotoKind
): string | null {
  if (!filename) return null
  return kind === 'barcode'
    ? '/mock/barcode-sample.jpg'
    : '/mock/product-sample.jpg'
}

// 순번으로 고정 uuid v4 형식 파일명을 만든다 (예: 00000000-0000-4000-8000-000000000001.jpg)
function mockFilename(seq: number): string {
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}.jpg`
}

interface MockSeed {
  raw_text: string
  product_no: string
  lot: string
  memo?: string
  photos: 'both' | 'barcode' | 'product' | 'none'
  created_at: string
  updated_at?: string
}

const LONG_RAW_TEXT =
  'PN:DK-LONG-0001;LOT:L2026-0912;QTY:1200;MFG:2026-09-01;EXP:2028-08-31;' +
  'VENDOR:DUCKIL-PARTNER-CO-LTD;PLANT:ANSAN-02;LINE:07;INSPECTOR:QA-TEAM-3;' +
  'REMARK:' +
  '포장 상태 양호, 외관 검사 합격, 라벨 재부착 없음, 보관 온도 15~25℃ 유지 필요. '.repeat(
    6
  )

const SEEDS: MockSeed[] = [
  {
    raw_text: 'PN:DK-1001;LOT:L2026-0928A',
    product_no: 'DK-1001',
    lot: 'L2026-0928A',
    photos: 'both',
    created_at: '2026-09-28T14:05:00+09:00',
  },
  {
    raw_text: 'PN:DK-1002;LOT:L2026-0928B',
    product_no: 'DK-1002',
    lot: 'L2026-0928B',
    memo: '박스 모서리 약간 찌그러짐',
    photos: 'both',
    created_at: '2026-09-28T13:40:12+09:00',
  },
  {
    raw_text: '(01)08801234567890(10)L2026-0927',
    product_no: '08801234567890',
    lot: 'L2026-0927',
    photos: 'barcode',
    created_at: '2026-09-28T11:02:45+09:00',
  },
  {
    raw_text: 'DK-1003|L2026-0927C|500',
    product_no: 'DK-1003',
    lot: 'L2026-0927C',
    photos: 'product',
    created_at: '2026-09-28T09:15:30+09:00',
  },
  {
    raw_text: MANUAL_RAW_TEXT,
    product_no: 'DK-MANUAL-01',
    lot: 'L2026-0927M',
    memo: '라벨 훼손으로 직접 입력',
    photos: 'product',
    created_at: '2026-09-27T17:55:00+09:00',
  },
  // 중복 쌍 1: DK-1001 / L2026-0928A (대소문자까지 일치, ROADMAP Q9)
  {
    raw_text: 'PN:DK-1001;LOT:L2026-0928A',
    product_no: 'DK-1001',
    lot: 'L2026-0928A',
    memo: '재입고분 중복 스캔',
    photos: 'both',
    created_at: '2026-09-27T16:20:00+09:00',
  },
  {
    raw_text: LONG_RAW_TEXT,
    product_no: 'DK-LONG-0001',
    lot: 'L2026-0912',
    memo: '원문이 긴 QR 샘플',
    photos: 'both',
    created_at: '2026-09-27T15:10:08+09:00',
  },
  {
    raw_text: 'PN:DK-1004;LOT:L2026-0926A',
    product_no: 'DK-1004',
    lot: 'L2026-0926A',
    photos: 'none',
    created_at: '2026-09-27T10:00:00+09:00',
  },
  {
    raw_text: 'PN:DK-1005;LOT:L2026-0926B',
    product_no: 'DK-1005',
    lot: 'L2026-0926B',
    photos: 'both',
    created_at: '2026-09-26T18:30:00+09:00',
    updated_at: '2026-09-27T09:12:00+09:00',
  },
  {
    raw_text: 'PN:DK-1006;LOT:L2026-0926C',
    product_no: 'DK-1006',
    lot: 'L2026-0926C',
    memo: '검수 보류 - 수량 확인 필요',
    photos: 'barcode',
    created_at: '2026-09-26T14:44:21+09:00',
  },
  {
    raw_text: 'PN=DK-1007;LOT=L2026-0925A',
    product_no: 'DK-1007',
    lot: 'L2026-0925A',
    photos: 'both',
    created_at: '2026-09-26T09:05:00+09:00',
  },
  {
    raw_text: 'PN:DK-1008;LOT:L2026-0925B',
    product_no: 'DK-1008',
    lot: 'L2026-0925B',
    photos: 'none',
    created_at: '2026-09-25T16:00:00+09:00',
  },
  // 중복 쌍 2: DK-2001 / L2026-0924 (3건)
  {
    raw_text: 'PN:DK-2001;LOT:L2026-0924',
    product_no: 'DK-2001',
    lot: 'L2026-0924',
    memo: '같은 Lot 3번째 박스',
    photos: 'both',
    created_at: '2026-09-25T11:14:02+09:00',
  },
  {
    raw_text: 'PN:DK-2001;LOT:L2026-0924',
    product_no: 'DK-2001',
    lot: 'L2026-0924',
    memo: '같은 Lot 2번째 박스',
    photos: 'product',
    created_at: '2026-09-25T11:12:40+09:00',
  },
  {
    raw_text: 'PN:DK-2001;LOT:L2026-0924',
    product_no: 'DK-2001',
    lot: 'L2026-0924',
    memo: '같은 Lot 첫 번째 박스',
    photos: 'none',
    created_at: '2026-09-25T11:11:11+09:00',
  },
  // 대소문자만 다른 경우는 중복이 아니다 (ROADMAP Q9)
  {
    raw_text: 'PN:dk-2001;LOT:l2026-0924',
    product_no: 'dk-2001',
    lot: 'l2026-0924',
    photos: 'barcode',
    created_at: '2026-09-24T17:30:00+09:00',
  },
  {
    raw_text: '(01)08809876543210(10)L2026-0923',
    product_no: '08809876543210',
    lot: 'L2026-0923',
    photos: 'both',
    created_at: '2026-09-24T10:20:00+09:00',
  },
  {
    raw_text: 'PN:DK-1009;LOT:L2026-0922A',
    product_no: 'DK-1009',
    lot: 'L2026-0922A',
    memo: '출하 전 최종 확인 완료. 고객사 요청으로 사진 2장 첨부.',
    photos: 'both',
    created_at: '2026-09-23T15:45:00+09:00',
  },
  {
    raw_text: 'PN:DK-1010;LOT:L2026-0922B',
    product_no: 'DK-1010',
    lot: 'L2026-0922B',
    photos: 'product',
    created_at: '2026-09-22T13:00:00+09:00',
  },
  {
    raw_text: MANUAL_RAW_TEXT,
    product_no: 'DK-MANUAL-02',
    lot: 'L2026-0921M',
    photos: 'none',
    created_at: '2026-09-21T08:50:00+09:00',
  },
  {
    raw_text: 'DK-1011|L2026-0920|120',
    product_no: 'DK-1011',
    lot: 'L2026-0920',
    photos: 'both',
    created_at: '2026-09-20T16:16:16+09:00',
  },
  {
    raw_text: 'PN:DK-1012;LOT:L2026-0918',
    product_no: 'DK-1012',
    lot: 'L2026-0918',
    memo: '메모 최대 길이 샘플: ' + '가'.repeat(480),
    photos: 'barcode',
    created_at: '2026-09-18T12:00:00+09:00',
  },
  {
    raw_text: 'PN:DK-1013;LOT:L2026-0915',
    product_no: 'DK-1013',
    lot: 'L2026-0915',
    photos: 'both',
    created_at: '2026-09-15T10:30:00+09:00',
  },
  {
    raw_text:
      'PN:DK-VERY-LONG-PRODUCT-NUMBER-SAMPLE-0001;LOT:L2026-0910-EXTRA-LONG-LOT',
    product_no: 'DK-VERY-LONG-PRODUCT-NUMBER-SAMPLE-0001',
    lot: 'L2026-0910-EXTRA-LONG-LOT',
    memo: '긴 Product No/Lot 표시 확인용',
    photos: 'both',
    created_at: '2026-09-10T09:00:00+09:00',
  },
  {
    raw_text: 'PN:DK-1014;LOT:L2026-0905',
    product_no: 'DK-1014',
    lot: 'L2026-0905',
    photos: 'none',
    created_at: '2026-09-05T14:25:00+09:00',
  },
  {
    raw_text: 'PN:DK-1015;LOT:L2026-0901',
    product_no: 'DK-1015',
    lot: 'L2026-0901',
    photos: 'product',
    created_at: '2026-09-01T08:00:00+09:00',
  },
  {
    raw_text: 'PN:DK-0999;LOT:L2026-0831',
    product_no: 'DK-0999',
    lot: 'L2026-0831',
    memo: '지난달 마지막 기록',
    photos: 'both',
    created_at: '2026-08-31T23:59:59+09:00',
  },
]

// 최신순(created_at 내림차순) 정렬된 더미 기록. id는 오래된 기록이 1번
export const MOCK_RECORDS: RecordDto[] = SEEDS.map((seed, index) => {
  const id = SEEDS.length - index
  const hasBarcode = seed.photos === 'both' || seed.photos === 'barcode'
  const hasProduct = seed.photos === 'both' || seed.photos === 'product'
  return {
    id,
    raw_text: seed.raw_text,
    product_no: seed.product_no,
    lot: seed.lot,
    memo: seed.memo ?? null,
    barcode_photo: hasBarcode ? mockFilename(id * 2 - 1) : null,
    product_photo: hasProduct ? mockFilename(id * 2) : null,
    created_at: seed.created_at,
    updated_at: seed.updated_at ?? seed.created_at,
  }
})

// id로 더미 기록 찾기 (상세 화면용)
export function findMockRecord(id: number): RecordDto | undefined {
  return MOCK_RECORDS.find(record => record.id === id)
}
