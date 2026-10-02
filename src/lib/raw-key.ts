// 원본 바코드 중복 판정 키 (ROADMAP Phase 7 Task 025). 클라이언트·서버 공용 순수 함수
import { MANUAL_RAW_TEXT } from '@/lib/constants'

// 제어문자(GS·RS·EOT 등)를 지우고 앞뒤 공백을 자른다.
// 카메라 원문(제어문자 포함)과 PDA 웨지 입력 원문(제어문자 빠짐)이 같은 키가 되게 한다.
// 직접 입력('[직접입력]')이나 빈 값은 중복 판정 대상이 아니므로 null을 반환한다
export function toRawKey(raw: string): string | null {
  const key = raw.replace(/[\x00-\x1f\x7f]/g, '').trim()
  if (!key || key === MANUAL_RAW_TEXT) return null
  return key
}
