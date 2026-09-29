// QR 파서(qr-parser.ts) 규칙별 샘플·기대값 확인
// 실행: node --import ./scripts/register-alias.mjs scripts/check-qr-parser.ts
import {
  normalizeProductNo,
  parseQr,
  type QrParseResult,
} from '@/lib/qr-parser'

// 14자리 GTIN 샘플 (GS1 AI 01)
const GTIN_SAMPLE = '12345678901234'

const NULL_RESULT: QrParseResult = {
  productNo: null,
  lot: null,
  matchedRule: null,
}

type Case = [string, string, QrParseResult]

const cases: Case[] = [
  // --- 규칙별 대표 샘플 ---
  [
    'key-value 대표 샘플',
    'PRODUCT:1234\nLOT:5678',
    { productNo: '1234', lot: '5678', matchedRule: 'key-value' },
  ],
  [
    'gs1-ai 대표 샘플 (괄호 형식)',
    `(01)${GTIN_SAMPLE}(10)LOT123`,
    { productNo: GTIN_SAMPLE, lot: 'LOT123', matchedRule: 'gs1-ai' },
  ],
  [
    'delimited 대표 샘플',
    '84739DC000G2E|2608200040',
    { productNo: '84739DC000G2E', lot: '2608200040', matchedRule: 'delimited' },
  ],

  // --- key-value: 별칭·대소문자·공백 무시 ---
  [
    'key-value 별칭(P/N, LOT_NO)·소문자·공백',
    '  p/n = 84739DC000G2E ; lot_no=2608200040',
    { productNo: '84739DC000G2E', lot: '2608200040', matchedRule: 'key-value' },
  ],
  [
    'key-value 별칭(PN, PRODUCT_NO 혼용)',
    'pn:1111\nPRODUCT_NO:2222\nLOT:9999',
    // PRODUCT_NO/PN 둘 다 productNo 별칭이지만 먼저 매칭된 값을 채택
    { productNo: '1111', lot: '9999', matchedRule: 'key-value' },
  ],

  // --- gs1-ai: FNC1 구분 형식 ---
  [
    'gs1-ai FNC1 구분 형식',
    `01${GTIN_SAMPLE}10LOT123\x1d`,
    { productNo: GTIN_SAMPLE, lot: 'LOT123', matchedRule: 'gs1-ai' },
  ],
  [
    'gs1-ai FNC1 구분 형식(구분자 없이 끝까지)',
    `01${GTIN_SAMPLE}10LOT456`,
    { productNo: GTIN_SAMPLE, lot: 'LOT456', matchedRule: 'gs1-ai' },
  ],

  // --- 한쪽 값만 빈 경우 실패 ---
  ['key-value 한쪽 값만 빈 경우 실패', 'PRODUCT:1234\nLOT:', NULL_RESULT],
  ['delimited 한쪽 값만 빈 경우 실패', '84739DC000G2E|', NULL_RESULT],

  // --- 빈 문자열 / URL ---
  ['빈 문자열', '', NULL_RESULT],
  ['공백만', '   ', NULL_RESULT],
  ['https URL', 'https://example.com/page?query=1', NULL_RESULT],
]

let failed = 0

for (const [name, raw, expected] of cases) {
  const actual = parseQr(raw)
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} → ${JSON.stringify(actual)}`)
}

// normalizeProductNo 4종
const normalizeCases: [string, string, string][] = [
  ['84739DC000G2E', '84739DC000G2E', '84739-DC000(G2E)'],
  ['84739-DC000(G2E) (이미 표 형식)', '84739-DC000(G2E)', '84739-DC000(G2E)'],
  ['84739dc000g2e (소문자)', '84739dc000g2e', '84739-DC000(G2E)'],
  ['ABC-123 (형식 불일치)', 'ABC-123', 'ABC-123'],
]

for (const [name, input, expected] of normalizeCases) {
  const actual = normalizeProductNo(input)
  const pass = actual === expected
  if (!pass) failed++
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  normalizeProductNo ${name} → ${actual}`
  )
}

console.log(failed === 0 ? '\n모든 검사 통과' : `\n실패 ${failed}건`)
process.exit(failed === 0 ? 0 : 1)
