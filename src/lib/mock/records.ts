// Phase 2 화면 개발용 더미 데이터. API를 호출하지 않고 화면을 채울 때만 사용한다
import { MANUAL_RAW_TEXT } from '@/lib/constants'
import type { RecordDto } from '@/lib/types/record'

export type MockPhotoKind = 'barcode' | 'product'

// 더미 사진 경로(public/mock, 가로형: 바코드 3:1·제품 5:1). scan-flow·record-detail-view와 공유한다
export const MOCK_PHOTO_URL: Record<MockPhotoKind, string> = {
  barcode: '/mock/barcode-sample.jpg',
  product: '/mock/product-sample.jpg',
}

// 더미 사진 파일명(uuid.jpg)을 public/mock/ 샘플 이미지 경로로 바꾼다
export function mockPhotoUrl(
  filename: string | null,
  kind: MockPhotoKind
): string | null {
  if (!filename) return null
  return MOCK_PHOTO_URL[kind]
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

// 참고 라벨 형식(줄바꿈 구분 Lot / P/NO / HW 버전, 예: 2608200040 / 84739DC000G2E / HW 1.00).
// P/NO는 붙여 쓴 원형 그대로 두고 변환하지 않는다 (ROADMAP Q1, Q15)
const SEEDS: MockSeed[] = [
  {
    raw_text: '2609280001 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2609280001',
    photos: 'both',
    created_at: '2026-09-28T14:05:00+09:00',
  },
  {
    raw_text: '2609280002 84739DC000G2F HW 1.00',
    product_no: '84739-DC000(G2F)',
    lot: '2609280002',
    memo: '박스 모서리 약간 찌그러짐',
    photos: 'both',
    created_at: '2026-09-28T13:40:12+09:00',
  },
  {
    raw_text: '2609280003 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609280003',
    photos: 'barcode',
    created_at: '2026-09-28T11:02:45+09:00',
  },
  {
    raw_text: '2609280004 84740DC100G2F HW 1.00',
    product_no: '84740-DC100(G2F)',
    lot: '2609280004',
    photos: 'product',
    created_at: '2026-09-28T09:15:30+09:00',
  },
  {
    raw_text: MANUAL_RAW_TEXT,
    product_no: '84741-DE200(G3A)',
    lot: '2609270001',
    memo: '라벨 훼손으로 직접 입력',
    photos: 'product',
    created_at: '2026-09-27T17:55:00+09:00',
  },
  // 중복 쌍 1: 84739-DC000(G2E) / 2609280001 (대소문자까지 일치, ROADMAP Q9)
  {
    raw_text: '2609280001 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2609280001',
    memo: '재입고분 중복 스캔',
    photos: 'both',
    created_at: '2026-09-27T16:20:00+09:00',
  },
  {
    raw_text: LONG_RAW_TEXT,
    product_no: '84741-DE200(G3A)',
    lot: '2609270002',
    memo: '원문이 긴 QR 샘플',
    photos: 'both',
    created_at: '2026-09-27T15:10:08+09:00',
  },
  {
    raw_text: '2609270003 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609270003',
    photos: 'none',
    created_at: '2026-09-27T10:00:00+09:00',
  },
  {
    raw_text: '2609260001 84739DC000G2F HW 1.00',
    product_no: '84739-DC000(G2F)',
    lot: '2609260001',
    photos: 'both',
    created_at: '2026-09-26T18:30:00+09:00',
    updated_at: '2026-09-27T09:12:00+09:00',
  },
  {
    raw_text: '2609260002 84740DC100G2F HW 1.00',
    product_no: '84740-DC100(G2F)',
    lot: '2609260002',
    memo: '검수 보류 - 수량 확인 필요',
    photos: 'barcode',
    created_at: '2026-09-26T14:44:21+09:00',
  },
  {
    raw_text: '2609260003 84741DE200G3A HW 1.00',
    product_no: '84741-DE200(G3A)',
    lot: '2609260003',
    photos: 'both',
    created_at: '2026-09-26T09:05:00+09:00',
  },
  {
    raw_text: '2609250001 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2609250001',
    photos: 'none',
    created_at: '2026-09-25T16:00:00+09:00',
  },
  // 중복 쌍 2: 84740-DC100(G2E) / 2609250002 (3건)
  {
    raw_text: '2609250002 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609250002',
    memo: '같은 Lot 3번째 박스',
    photos: 'both',
    created_at: '2026-09-25T11:14:02+09:00',
  },
  {
    raw_text: '2609250002 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609250002',
    memo: '같은 Lot 2번째 박스',
    photos: 'product',
    created_at: '2026-09-25T11:12:40+09:00',
  },
  {
    raw_text: '2609250002 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609250002',
    memo: '같은 Lot 첫 번째 박스',
    photos: 'none',
    created_at: '2026-09-25T11:11:11+09:00',
  },
  // 대소문자만 다른 경우는 중복이 아니다 (ROADMAP Q9). Lot은 숫자라 동일, Product No만 소문자
  {
    raw_text: '2609250002 84740dc100g2e HW 1.00',
    product_no: '84740-dc100(g2e)',
    lot: '2609250002',
    photos: 'barcode',
    created_at: '2026-09-24T17:30:00+09:00',
  },
  {
    raw_text: '2609240001 84739DC000G2F HW 1.00',
    product_no: '84739-DC000(G2F)',
    lot: '2609240001',
    photos: 'both',
    created_at: '2026-09-24T10:20:00+09:00',
  },
  {
    raw_text: '2609230001 84740DC100G2F HW 1.00',
    product_no: '84740-DC100(G2F)',
    lot: '2609230001',
    memo: '출하 전 최종 확인 완료. 고객사 요청으로 사진 2장 첨부.',
    photos: 'both',
    created_at: '2026-09-23T15:45:00+09:00',
  },
  {
    raw_text: '2609220001 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2609220001',
    photos: 'product',
    created_at: '2026-09-22T13:00:00+09:00',
  },
  {
    raw_text: MANUAL_RAW_TEXT,
    product_no: '84740-DC100(G2F)',
    lot: '2609210001',
    photos: 'none',
    created_at: '2026-09-21T08:50:00+09:00',
  },
  {
    raw_text: '2609200001 84741DE200G3A HW 1.00',
    product_no: '84741-DE200(G3A)',
    lot: '2609200001',
    photos: 'both',
    created_at: '2026-09-20T16:16:16+09:00',
  },
  {
    raw_text: '2609180001 84739DC000G2F HW 1.00',
    product_no: '84739-DC000(G2F)',
    lot: '2609180001',
    memo: '메모 최대 길이 샘플: ' + '가'.repeat(480),
    photos: 'barcode',
    created_at: '2026-09-18T12:00:00+09:00',
  },
  {
    raw_text: '2609150001 84740DC100G2F HW 1.00',
    product_no: '84740-DC100(G2F)',
    lot: '2609150001',
    photos: 'both',
    created_at: '2026-09-15T10:30:00+09:00',
  },
  {
    raw_text:
      '2609100000000000001 84739DC000G2EVERYLONGSUFFIXFORUIOVERFLOWTESTSAMPLE0001 HW 1.00',
    product_no:
      '84739-DC000(G2E-VERY-LONG-SUFFIX-FOR-UI-OVERFLOW-TEST-SAMPLE-0001)',
    lot: '2609100000000000001',
    memo: '긴 Product No/Lot 표시 확인용',
    photos: 'both',
    created_at: '2026-09-10T09:00:00+09:00',
  },
  {
    raw_text: '2609050001 84740DC100G2E HW 1.00',
    product_no: '84740-DC100(G2E)',
    lot: '2609050001',
    photos: 'none',
    created_at: '2026-09-05T14:25:00+09:00',
  },
  {
    raw_text: '2609010001 84741DE200G3A HW 1.00',
    product_no: '84741-DE200(G3A)',
    lot: '2609010001',
    photos: 'product',
    created_at: '2026-09-01T08:00:00+09:00',
  },
  {
    raw_text: '2608310001 84739DC000G2F HW 1.00',
    product_no: '84739-DC000(G2F)',
    lot: '2608310001',
    memo: '지난달 마지막 기록',
    photos: 'both',
    created_at: '2026-08-31T23:59:59+09:00',
  },
  // 참고 라벨 실측값: 84739-DC000(G2E) / 2608200040·2608200041 (ROADMAP Q1)
  {
    raw_text: '2608200041 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2608200041',
    memo: '참고 라벨 샘플 2',
    photos: 'both',
    created_at: '2026-08-20T10:05:00+09:00',
  },
  {
    raw_text: '2608200040 84739DC000G2E HW 1.00',
    product_no: '84739-DC000(G2E)',
    lot: '2608200040',
    memo: '참고 라벨 샘플',
    photos: 'both',
    created_at: '2026-08-20T10:00:00+09:00',
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
