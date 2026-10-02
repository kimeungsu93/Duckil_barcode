// PDA 키보드 웨지 입력 정리 (ROADMAP Phase 7 Task 024). 브라우저·Node 공용 순수 함수
//
// 키보드 웨지는 GS(\x1d)·RS(\x1e)·EOT(\x04) 같은 제어문자를 그대로 보내지 못하는 기기가 많다.
// PDA 스캐너 설정에서 제어문자를 대체 문자열(<GS>, {GS} 등)로 보내게 하면 여기서 원래 제어문자로
// 되돌려 qr-parser의 iso15434 규칙이 카메라 인식 원문과 똑같이 동작하게 한다.
const CONTROL_TOKENS: Record<string, string> = {
  GS: '\x1d',
  RS: '\x1e',
  EOT: '\x04',
}

// <GS> {GS} [GS] 형태(대소문자 무시)를 제어문자로 바꾼다
const TOKEN_PATTERN = /[<{[](GS|RS|EOT)[>}\]]/gi

export function normalizeWedgeText(value: string): string {
  return value
    .replace(TOKEN_PATTERN, (_match, name: string) => {
      return CONTROL_TOKENS[name.toUpperCase()] ?? ''
    })
    .replace(/[\r\n]+$/, '')
}
