// KST(+09:00) 시간 유틸. 서버 OS 타임존과 무관하게 UTC 기준으로 계산한다 (ROADMAP Q2)
// 브라우저·Node 공용 순수 모듈

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const KST_SUFFIX = '+09:00'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

// UTC 기준 Date를 KST 날짜 문자열(YYYY-MM-DD)로 변환
function toKstDateString(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS)
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`
}

// 현재(또는 지정) 시각을 'YYYY-MM-DDTHH:mm:ss+09:00' 형식으로 반환
// created_at/updated_at 저장에 사용한다 (SQLite 기본 시각 함수 사용 금지)
export function nowKstIso(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS)
  const time = `${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}:${pad2(kst.getUTCSeconds())}`
  return `${toKstDateString(date)}T${time}${KST_SUFFIX}`
}

// 오늘 KST 날짜(YYYY-MM-DD). 내보내기 기간 기본값 등에 사용
export function todayKstDate(date: Date = new Date()): string {
  return toKstDateString(date)
}

// 기간 비교 시작값: 'YYYY-MM-DDT00:00:00+09:00'
export function kstDayStart(dateString: string): string {
  return `${dateString}T00:00:00${KST_SUFFIX}`
}

// 기간 비교 끝값(미포함): 다음 날 'YYYY-MM-DDT00:00:00+09:00'
// 사용: created_at >= kstDayStart(from) AND created_at < kstNextDayStart(to)
export function kstNextDayStart(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const nextDate = `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`
  return kstDayStart(nextDate)
}

// 화면 표시용 'YYYY-MM-DD HH:mm'. KST 문자열을 그대로 잘라 써서 브라우저 타임존 영향이 없다
export function formatKstDisplay(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}
