// 순수 QR 파서 모듈 - 브라우저·서버 API(window, document, node:*, next)에 의존하지 않는다.
// 규칙을 순서대로 시도해 처음 성공한 규칙을 채택한다: iso15434 → key-value → gs1-ai → delimited.
// 이 파일과 scripts/check-qr-parser.ts 외에는 수정하지 않는다 (Task 014·015와 병행 작업 중, 파일 소유 분리).

// 파싱 결과. 모든 규칙이 실패하면 세 값 모두 null.
export interface QrParseResult {
  productNo: string | null
  lot: string | null
  matchedRule: string | null
}

// 규칙 하나의 계약. parse는 실패 시 null을 반환한다 (예외를 던지지 않음).
export interface QrRule {
  name: string
  parse(raw: string): { productNo: string; lot: string } | null
}

// key-value 규칙에서 쓰는 키 별칭. 대소문자·공백·구분기호(_, /)를 무시하고 비교하기 위해
// normalizeKey로 영숫자만 남긴 형태로 미리 정규화해 둔다.
// PRODUCT, PRODUCT_NO, P/N, PN → 정규화하면 PRODUCT, PRODUCTNO, PN, PN
const PRODUCT_NO_KEY_ALIASES = new Set(['PRODUCT', 'PRODUCTNO', 'PN'])
// LOT, LOT_NO → 정규화하면 LOT, LOTNO
const LOT_KEY_ALIASES = new Set(['LOT', 'LOTNO'])

// 키 문자열을 대문자로 바꾸고 영숫자 이외 문자(공백, _, /, - 등)를 모두 제거한다.
function normalizeKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// key-value 규칙: 줄바꿈·;·|·, 로 나눈 각 항목을 "키:값" 또는 "키=값"으로 파싱한다.
// https:// 같은 URL은 키가 별칭 화이트리스트에 없어 자연스럽게 실패한다.
function parseKeyValue(raw: string): { productNo: string; lot: string } | null {
  const entries = raw.split(/\r?\n|[;|,]/)
  let productNo: string | null = null
  let lot: string | null = null

  for (const entry of entries) {
    const match = entry.match(/^\s*([^:=]+?)\s*[:=]\s*(.*)$/)
    if (!match) continue

    const key = normalizeKey(match[1])
    const value = match[2].trim()
    if (!value) continue

    if (productNo === null && PRODUCT_NO_KEY_ALIASES.has(key)) {
      productNo = value
    } else if (lot === null && LOT_KEY_ALIASES.has(key)) {
      lot = value
    }
  }

  if (!productNo || !lot) return null
  return { productNo, lot }
}

// GS1 AI 14자리 GTIN(AI 01) 형식 검증용
const GTIN_PATTERN = /^\d{14}$/

// gs1-ai 규칙 중 괄호 형식: (01)GTIN(10)LOT. AI 순서는 무관하게 처리한다.
function parseGs1Parens(
  value: string
): { productNo: string; lot: string } | null {
  const pattern = /\((\d{2})\)([^()]*)/g
  let productNo: string | null = null
  let lot: string | null = null
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    const ai = match[1]
    const content = match[2].trim()
    if (ai === '01' && productNo === null && GTIN_PATTERN.test(content)) {
      productNo = content
    } else if (ai === '10' && lot === null && content) {
      lot = content
    }
  }

  if (!productNo || !lot) return null
  return { productNo, lot }
}

// AI 10(Lot)의 최대 길이 (GS1 일반 사양)
const GS1_AI10_MAX_LENGTH = 20

// gs1-ai 규칙 중 FNC1 구분 형식: "01" + GTIN(고정 14자리) + "10" + Lot(가변, FNC1 또는 끝까지).
// 전송 시작을 알리는 선행 FNC1(\x1d)이 붙어 있을 수 있어 먼저 제거한다.
function parseGs1Fnc1(
  value: string
): { productNo: string; lot: string } | null {
  let rest = value.replace(/^\x1d+/, '')
  if (!rest.startsWith('01')) return null

  const gtin = rest.slice(2, 16)
  if (!GTIN_PATTERN.test(gtin)) return null

  rest = rest.slice(16)
  if (!rest.startsWith('10')) return null
  rest = rest.slice(2)

  const separatorIndex = rest.indexOf('\x1d')
  const lotRaw =
    separatorIndex === -1
      ? rest.slice(0, GS1_AI10_MAX_LENGTH)
      : rest.slice(0, Math.min(separatorIndex, GS1_AI10_MAX_LENGTH))
  const lot = lotRaw.trim()

  if (!gtin || !lot) return null
  return { productNo: gtin, lot }
}

function parseGs1Ai(raw: string): { productNo: string; lot: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return parseGs1Parens(trimmed) ?? parseGs1Fnc1(trimmed)
}

// delimited 규칙의 위치 설정. 인덱스만 바꾸면 순서를 조정할 수 있다.
export interface DelimitedRuleConfig {
  productNoIndex: number
  lotIndex: number
}

export const DELIMITED_RULE_CONFIG: DelimitedRuleConfig = {
  productNoIndex: 0,
  lotIndex: 1,
}

// delimited 규칙: |, ;, , 중 문자열에서 처음 발견되는 구분자 하나로 split해 위치로 값을 꺼낸다.
function parseDelimited(
  raw: string
): { productNo: string; lot: string } | null {
  const found = raw.match(/[|;,]/)
  if (!found) return null

  const delimiter = found[0]
  const parts = raw.split(delimiter).map(part => part.trim())
  const productNo = parts[DELIMITED_RULE_CONFIG.productNoIndex]
  const lot = parts[DELIMITED_RULE_CONFIG.lotIndex]

  if (!productNo || !lot) return null
  return { productNo, lot }
}

// iso15434 규칙: 실제 제품 라벨 Data Matrix 원문 형식 (ISO/IEC 15434 + ANSI MH10.8.2 데이터 식별자).
// 예: "[)>␞06␝VSJNW␝P846L9DC000␝T2606191J04A0000196␝CB.00␝␞␄"
//   (␞=RS \x1e, ␝=GS \x1d, ␄=EOT \x04. 라벨 인쇄 텍스트: 2606190196 / 846L9DC000 / HW B.00)
//   - P 세그먼트 = Product No (846L9DC000)
//   - T 세그먼트(추적 번호)의 앞쪽 연속 숫자 = Lot (2606191). 첫 영문자부터는 Lot이 아니다
//   - V(공급자 코드), C(HW 버전)는 현재 저장 스키마에 대응 필드가 없어 쓰지 않는다
const ISO15434_HEADER = '[)>'
const ISO15434_SEPARATOR = /[\x1d\x1e\x04]/
const ISO15434_LOT_PATTERN = /^\d+/

function parseIso15434(raw: string): { productNo: string; lot: string } | null {
  const trimmed = raw.trim()
  if (!trimmed.startsWith(ISO15434_HEADER)) return null

  const segments = trimmed
    .slice(ISO15434_HEADER.length)
    .split(ISO15434_SEPARATOR)
    .map(segment => segment.trim())
  const productNo = segments.find(s => s.startsWith('P'))?.slice(1)
  const tracking = segments.find(s => s.startsWith('T'))?.slice(1)
  const lot = tracking?.match(ISO15434_LOT_PATTERN)?.[0]

  if (!productNo || !lot) return null
  return { productNo, lot }
}

// 규칙 목록. 앞에서부터 순서대로 시도하고 처음 성공하는 규칙을 채택한다 (PRD §3 F2).
// 실제 라벨 형식(iso15434)을 가장 먼저 시도한다.
export const QR_RULES: QrRule[] = [
  { name: 'iso15434', parse: parseIso15434 },
  { name: 'key-value', parse: parseKeyValue },
  { name: 'gs1-ai', parse: parseGs1Ai },
  { name: 'delimited', parse: parseDelimited },
]

// QR 원문을 파싱해 Product No / Lot을 뽑아낸다.
// 빈 문자열·공백만 있는 입력은 규칙을 시도하지 않고 즉시 실패로 본다.
// 이 함수는 P/NO 표기 정규화를 하지 않는다 (normalizeProductNo를 Task 016에서 별도로 적용).
export function parseQr(raw: string): QrParseResult {
  if (!raw || !raw.trim()) {
    return { productNo: null, lot: null, matchedRule: null }
  }

  for (const rule of QR_RULES) {
    const result = rule.parse(raw)
    if (!result) continue

    const productNo = result.productNo.trim()
    const lot = result.lot.trim()
    if (productNo && lot) {
      return { productNo, lot, matchedRule: rule.name }
    }
  }

  return { productNo: null, lot: null, matchedRule: null }
}

// P/NO 표기 정규화 (ROADMAP Q15, PRD F2-5).
// 대문자로 바꾼 값이 "5자리 숫자 + 5자리 영숫자 + 1자 이상 영숫자" 형식(하이픈·괄호 없음)에
// 맞을 때만 "prefix-code(suffix)" 형식으로 바꾼다. 맞지 않으면 원본을 그대로 반환하고 예외를 던지지 않는다.
// 예: "84739DC000G2E" → "84739-DC000(G2E)", 이미 표 형식이거나 다른 형식이면 원본 그대로.
const PRODUCT_NO_PATTERN = /^(\d{5})([A-Z0-9]{5})([A-Z0-9]+)$/

export function normalizeProductNo(value: string): string {
  const upper = value.toUpperCase()
  const match = upper.match(PRODUCT_NO_PATTERN)
  if (!match) return value

  const [, prefix, code, suffix] = match
  return `${prefix}-${code}(${suffix})`
}
