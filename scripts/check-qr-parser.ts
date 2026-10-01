// QR 파서(qr-parser.ts) 규칙별 샘플·기대값 확인
// 실행: node --import ./scripts/register-alias.mjs scripts/check-qr-parser.ts
// 실제 라벨 샘플 성공률: ... scripts/check-qr-parser.ts --samples tests/fixtures/qr-samples.json
import { readFileSync } from 'node:fs'
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

  // --- iso15434: 실제 제품 라벨 Data Matrix 원문 ---
  [
    'iso15434 실제 라벨 원문',
    '[)>\x1e06\x1dVSJNW\x1dP846L9DC000\x1dT2606191J04A0000196\x1dCB.00\x1d\x1e\x04',
    { productNo: '846L9DC000', lot: '2606191', matchedRule: 'iso15434' },
  ],
  [
    'iso15434 T 세그먼트 없으면 실패',
    '[)>\x1e06\x1dVSJNW\x1dP846L9DC000\x1dCB.00\x1d\x1e\x04',
    NULL_RESULT,
  ],
  [
    'iso15434 T 세그먼트가 숫자로 시작하지 않으면 실패',
    '[)>\x1e06\x1dP846L9DC000\x1dTJ04A0000196\x1e\x04',
    NULL_RESULT,
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

// --- 실제 라벨 샘플 성공률 측정 (ROADMAP Task 021, PRD §9 목표 95%) ---
// --samples <경로>를 주면 샘플 파일의 원문을 화면과 같은 방식(parseQr → normalizeProductNo)으로
// 처리해 기대값과 비교한다. 형식은 tests/fixtures/qr-samples.example.json 참고
const AUTO_FILL_TARGET_RATE = 95

interface QrSample {
  id: string
  // 라벨 코드 종류 (datamatrix, qr, code128 등, ROADMAP Q14)
  labelType: string
  // 거래처·라벨 종류 등 출처 메모
  source?: string
  raw: string
  // 화면에 자동 입력되어야 하는 값 (Product No는 표 형식 변환 후 값)
  expected: { productNo: string; lot: string }
}

function readSamples(filePath: string): QrSample[] {
  const data: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
  if (!Array.isArray(data)) throw new Error('샘플 파일은 배열이어야 합니다')
  return data.map((item: QrSample, index) => {
    if (
      typeof item?.id !== 'string' ||
      typeof item.raw !== 'string' ||
      typeof item.expected?.productNo !== 'string' ||
      typeof item.expected?.lot !== 'string'
    ) {
      throw new Error(`${index}번째 샘플 형식이 올바르지 않습니다`)
    }
    return item
  })
}

const samplesIndex = process.argv.indexOf('--samples')
let samplesFailed = false

if (samplesIndex !== -1) {
  const samplesPath = process.argv[samplesIndex + 1]
  if (!samplesPath) throw new Error('사용법: --samples <샘플 JSON 경로>')

  const samples = readSamples(samplesPath)
  const failures: string[] = []

  for (const sample of samples) {
    const result = parseQr(sample.raw)
    const productNo = result.productNo
      ? normalizeProductNo(result.productNo)
      : null
    const pass =
      productNo === sample.expected.productNo &&
      result.lot === sample.expected.lot
    if (!pass) {
      failures.push(
        [
          `- ${sample.id} (${sample.labelType}${sample.source ? `, ${sample.source}` : ''})`,
          `  원문: ${JSON.stringify(sample.raw)}`,
          `  기대: ${sample.expected.productNo} / ${sample.expected.lot}`,
          `  실제: ${productNo ?? '(없음)'} / ${result.lot ?? '(없음)'} (규칙: ${result.matchedRule ?? '없음'})`,
        ].join('\n')
      )
    }
  }

  const passed = samples.length - failures.length
  const rate = samples.length === 0 ? 0 : (passed / samples.length) * 100
  samplesFailed = rate < AUTO_FILL_TARGET_RATE

  console.log(`\n=== 샘플 자동 입력 성공률 (${samplesPath}) ===`)
  console.log(
    `성공 ${passed}/${samples.length}건, ${rate.toFixed(1)}% (목표 ${AUTO_FILL_TARGET_RATE}% 이상)`
  )
  if (failures.length > 0) console.log(`\n실패 목록:\n${failures.join('\n')}`)
  console.log(samplesFailed ? '\n목표 미달' : '\n목표 달성')
}

process.exit(failed === 0 && !samplesFailed ? 0 : 1)
