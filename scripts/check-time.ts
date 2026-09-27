// KST 유틸이 OS 타임존과 무관한지 확인
// 실행: TZ=UTC node --import ./scripts/register-alias.mjs scripts/check-time.ts
//       TZ=Asia/Seoul node --import ./scripts/register-alias.mjs scripts/check-time.ts
import {
  formatKstDisplay,
  kstDayStart,
  kstNextDayStart,
  nowKstIso,
  todayKstDate,
} from '@/lib/time'

// 고정 시각: UTC 2026-09-28 15:30:05 → KST 2026-09-29 00:30:05 (날짜 경계)
const fixed = new Date(Date.UTC(2026, 8, 28, 15, 30, 5))

const results = {
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  nowKstIso: nowKstIso(fixed),
  todayKstDate: todayKstDate(fixed),
  kstDayStart: kstDayStart('2026-09-29'),
  kstNextDayStart_yearEnd: kstNextDayStart('2026-12-31'),
  kstNextDayStart_leap: kstNextDayStart('2028-02-28'),
  formatKstDisplay: formatKstDisplay('2026-09-29T00:30:05+09:00'),
  nowFormatOk: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(nowKstIso()),
}

const expected = {
  nowKstIso: '2026-09-29T00:30:05+09:00',
  todayKstDate: '2026-09-29',
  kstDayStart: '2026-09-29T00:00:00+09:00',
  kstNextDayStart_yearEnd: '2027-01-01T00:00:00+09:00',
  kstNextDayStart_leap: '2028-02-29T00:00:00+09:00',
  formatKstDisplay: '2026-09-29 00:30',
  nowFormatOk: true,
}

let failed = 0
for (const [key, value] of Object.entries(expected)) {
  const actual = results[key as keyof typeof results]
  const pass = actual === value
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${key}: ${String(actual)}`)
}
console.log(
  `TZ=${results.tz} → ${failed === 0 ? '모든 검사 통과' : `실패 ${failed}건`}`
)
process.exit(failed === 0 ? 0 : 1)
