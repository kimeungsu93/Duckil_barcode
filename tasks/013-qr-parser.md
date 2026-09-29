# Task 013: QR 파서 모듈 구현 (교체 가능 구조 + 기본 규칙)

> ROADMAP: `docs/ROADMAP.md` Phase 4 · Task 013
> 의존: Task 003
> 상태: 완료

## 개요

브라우저·서버 어느 쪽 API에도 의존하지 않는 순수 QR 파서 `src/lib/qr-parser.ts`를 구현했다. `parseQr`는 key-value → gs1-ai → delimited 순서로 규칙을 시도해 Product No/Lot을 뽑아내고, `normalizeProductNo`는 붙여 쓴 품번을 제출 표 형식으로 변환한다. 검증 스크립트(`scripts/check-qr-parser.ts`)로 16개 케이스를 확인했고, Task 016 연결 후 Playwright MCP로 `/scan` 직접 입력 화면에서 규칙별 샘플의 자동 입력 결과를 확인했다.

## 관련 파일

- 생성: `src/lib/qr-parser.ts`, `scripts/check-qr-parser.ts`
- 참고: `docs/PRD.md` §3 F2 / `docs/ROADMAP.md` Q1, Q15

## 수락 기준

- [x] 3개 규칙의 대표 샘플과 모든 규칙이 실패하는 샘플(빈 문자열, 임의 URL)의 결과가 기대값과 같다
- [x] `normalizeProductNo` 샘플 4종이 기대값과 같다: `84739DC000G2E` → `84739-DC000(G2E)`, `84739-DC000(G2E)` → 그대로, `84739dc000g2e` → `84739-DC000(G2E)`, `ABC-123` → 그대로 (F2-5)
- [x] 파서가 브라우저·서버 어느 쪽 API에도 의존하지 않는다 (import 없이 순수 함수만 사용)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `QrParseResult`, `QrRule` 타입과 `QR_RULES` 배열(key-value, gs1-ai, delimited 순) 작성
- [x] 2단계: key-value 규칙 — 줄바꿈/`;`/`|`/`,`로 나눈 `키:값`·`키=값`, 별칭(`PRODUCT`, `PRODUCT_NO`, `P/N`, `PN`, `LOT`, `LOT_NO`)을 대소문자·구분기호 무시로 매칭
- [x] 3단계: gs1-ai 규칙 — `(01)GTIN(10)LOT` 괄호 형식과 FNC1(`\x1d`) 구분 형식 모두 지원
- [x] 4단계: delimited 규칙 — `|`/`;`/`,` 중 처음 발견되는 구분자로 분리, 위치는 `DELIMITED_RULE_CONFIG`로 분리
- [x] 5단계: `normalizeProductNo` — `^(\d{5})([A-Z0-9]{5})([A-Z0-9]+)$` 패턴에만 `$1-$2($3)` 변환 적용, 예외 없음
- [x] 6단계: `scripts/check-qr-parser.ts` 작성 및 실행 (Node 24 타입 스트리핑)
- [x] 7단계(Task 016 연결 후): Playwright MCP로 `/scan` 직접 입력 원문란에 규칙별 샘플 입력, 자동 입력 결과 확인

## 테스트 체크리스트

> 순수 함수 모듈. 검증 스크립트(주력) + Playwright MCP(직접 입력 화면 연결 확인)로 검증했다.

| 항목                                                                 | 기대                                            | 실제                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| 검증 스크립트 전 항목                                                | 16/16 통과                                      | ✅ `node --import ./scripts/register-alias.mjs scripts/check-qr-parser.ts` 16/16 |
| 직접 입력 원문란에 key-value 샘플(`PN:84739DC000G2E;LOT:2608200040`) | Product No `84739-DC000(G2E)`, Lot `2608200040` | ✅ blur 시 자동 입력 확인 (Playwright)                                           |
| 직접 입력 원문란에 GS1 괄호형 샘플(`(01)08801234567890(10)LOT123`)   | Product No 정규화 결과, Lot `LOT123`            | ✅ `08801-23456(7890)` / `LOT123` 자동 입력 확인 (GTIN도 패턴에 맞으면 정규화됨) |
| 직접 입력 원문란에 delimited 샘플(`84739DC000G2E\|2608200040`)       | Product No `84739-DC000(G2E)`, Lot `2608200040` | ✅ 자동 입력 확인                                                                |
| 실패 샘플(`?preview=parse-fail`, 임의 형식)                          | "자동 인식 실패, 직접 입력해주세요" + 빈 필드   | ✅ 화면 확인 (Task 006에서 이미 구현된 S-스캔-3 표시)                            |

## 확인 필요

- Q1: 실제 QR 샘플 원문은 아직 미확보. Task 021에서 실제 샘플로 전용 규칙을 `QR_RULES` 맨 앞에 추가할 예정
- Q15: P/NO 정규화 패턴은 참고 라벨 1건 기준. 다른 품번 체계가 발견되면 Task 021에서 보완

## 변경 사항 요약

- `src/lib/qr-parser.ts`(신규): `parseQr`, `QR_RULES`(key-value·gs1-ai·delimited), `normalizeProductNo`, `DELIMITED_RULE_CONFIG` export. 브라우저·Node 어느 런타임에서도 그대로 동작하는 순수 함수만 사용
- `scripts/check-qr-parser.ts`(신규): 대표 샘플·별칭·FNC1 구분자·실패 케이스·`normalizeProductNo` 4종 검증, 16/16 통과
- Task 016(`scan-flow.tsx`, `confirm-step.tsx`)에서 이 모듈을 그대로 import해 자동 입력에 연결했다. 이 문서 작성 시점에는 Task 016이 이미 완료돼 있어 연결 후 화면 확인까지 함께 기록했다
