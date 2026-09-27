# Development Guidelines (AI Agent 전용)

> 이 문서는 AI 코딩 에이전트용 작업 규칙이다. 일반 개발 지식은 적지 않는다. 규칙끼리 충돌하면 **§9 결정 기준**을 따른다.

## 1. 프로젝트 개요

- **Duckil Barcode**: 휴대폰 브라우저로 제품 QR을 스캔해 Product No/Lot을 추출하고, 사진 2장(바코드·제품)과 함께 저장한 뒤 사진이 들어간 Excel로 내보내는 사내 웹앱 MVP
- 스택: Next.js 15.5.3 App Router(Turbopack), React 19.1, TypeScript 5(strict), TailwindCSS v4, shadcn/ui(new-york, neutral, lucide), React Hook Form, Zod 4, sonner, `better-sqlite3`, `@zxing/browser`, `exceljs`, Node.js 24.16
- **현재 상태**: Phase 2 완료(2026-09-28). 4개 화면(홈·스캔·상세·내보내기)이 더미 데이터로 동작하고, 화면 상태는 개발 모드 `?preview=`로 확인한다. Task 008-1 UX 검토 결과(Q11~Q13)가 PRD/ROADMAP에 반영됨. 다음 작업은 Phase 3 Task 009
- 로그인·권한·오프라인 동기화·3장 이상 사진·마스터 연동은 **범위 외**. 구현하지 않는다

## 2. 기준 문서와 우선순위

| 우선순위 | 문서               | 용도                                                     |
| -------- | ------------------ | -------------------------------------------------------- |
| 1        | `docs/PRD.md`      | 요구사항·API 명세·검증 규칙·화면 상태의 **최종 기준**    |
| 2        | `docs/ROADMAP.md`  | Task 순서, 담당 파일 경로, 미결 사항 임시 기본값(Q1~Q10) |
| 3        | `tasks/XXX-*.md`   | 개별 Task 명세·진행 상황                                 |
| 4        | `docs/guides/*.md` | 구조·컴포넌트·스타일·Next.js 15·폼 작성 방식             |
| 5        | `CLAUDE.md`        | 명령어·완료 체크리스트                                   |

- 작업 시작 전 **반드시** 해당 Task의 ROADMAP 항목(담당 파일, 구현 사항, 완료 조건)을 읽는다
- ROADMAP이 지정한 파일 경로를 그대로 사용한다. 임의로 경로·파일명을 바꾸지 않는다
- ⚠️ PRD §3 F2·§10의 "Task 013(실제 QR 샘플)"은 ROADMAP 기준 **Task 021**이다. ROADMAP 번호를 사용한다

## 3. 디렉토리 구조와 파일 배치

| 위치                                                                 | 넣는 것                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `src/app/{route}/page.tsx`                                           | 라우트: `/`, `/scan`, `/records/[id]`, `/export` 만 존재                          |
| `src/app/{route}/_components/`                                       | 해당 라우트 전용 컴포넌트 (홈 전용은 `src/app/_components/`)                      |
| `src/app/api/records/route.ts`                                       | GET(목록), POST(생성)                                                             |
| `src/app/api/records/[id]/route.ts`                                  | GET, PATCH, DELETE                                                                |
| `src/app/api/photos/[file]/route.ts`                                 | 사진 제공                                                                         |
| `src/app/api/export/route.ts`                                        | Excel 생성                                                                        |
| `src/components/ui/`                                                 | shadcn 컴포넌트만. `npx shadcn@latest add`로만 추가                               |
| `src/components/{layout,navigation,states,dialogs,scanner,records}/` | 2개 이상 화면에서 쓰는 공용 컴포넌트                                              |
| `src/lib/types/`                                                     | `record.ts`(RecordRow, RecordDto 등), `api.ts`(ApiErrorBody, ApiErrorCode)        |
| `src/lib/schemas/`                                                   | Zod 스키마 `record.ts`, `export.ts`, `photo.ts` (클라이언트·서버 공용)            |
| `src/lib/constants.ts`                                               | 모든 제한 수치의 **단일 출처**                                                    |
| `src/lib/time.ts`                                                    | KST 시간 유틸 (`nowKstIso`, `kstDayStart`, `kstNextDayStart`, `formatKstDisplay`) |
| `src/lib/api-error.ts`                                               | 에러 응답 헬퍼 `apiError(...)`, ZodError → `fields` 변환                          |
| `src/lib/db.ts`, `records-repo.ts`, `storage.ts`, `excel-export.ts`  | **서버 전용**. 첫 줄 `import 'server-only'`                                       |
| `src/lib/qr-parser.ts`                                               | QR 파서 순수 함수 (브라우저·Node 공용)                                            |
| `src/lib/api/*-client.ts`                                            | 클라이언트용 fetch 래퍼                                                           |
| `src/lib/mock/`, `public/mock/`                                      | Phase 2 더미 데이터·샘플 이미지                                                   |
| `src/hooks/`                                                         | 커스텀 훅                                                                         |
| `scripts/`                                                           | Node 24 타입 스트리핑으로 실행하는 검증 스크립트 (`node scripts/x.ts`)            |
| `tests/fixtures/`                                                    | Playwright MCP 테스트 이미지(정상 JPEG, PNG, 5MB 초과, 비이미지, HEIC)            |
| `data/`                                                              | 런타임 DB(`app.db`)와 `uploads/`. **git 커밋 금지**                               |
| `tasks/`                                                             | Task 작업 파일 `XXX-description.md`                                               |

- 새 폴더·주요 파일을 추가하거나 예제 파일을 삭제하면 `docs/guides/project-structure.md`를 **함께 갱신**한다

## 4. 코드 표준

### 포맷·린트 (설정 파일 기준)

- Prettier: 세미콜론 없음, 작은따옴표, 2칸 들여쓰기, `trailingComma: es5`, `arrowParens: avoid`, `printWidth: 80`, LF. Tailwind 클래스 정렬은 `prettier-plugin-tailwindcss`에 맡긴다
- ESLint: `next/core-web-vitals` + `next/typescript` + `prettier`. 규칙을 끄는 주석(`eslint-disable`)을 추가하지 않는다
- import는 `@/*` 별칭(`./src/*`)을 사용한다. `../../` 상대 경로로 `src` 밖을 거슬러 올라가지 않는다
- `.md` 파일도 `format:check` 대상이다. 문서를 수정하면 `npx prettier --write <파일>`을 실행한다

### 언어

- 주석·문서·커밋 메시지·UI 문구: **한국어**
- 변수·함수·파일명: 영어. 파일명은 kebab-case(`record-list-item.tsx`)
- API 필드와 DTO 키: **snake_case**(`product_no`, `raw_text`, `created_at`) — PRD §4 응답 형식 그대로
- 컴포넌트 내부 상태·props: camelCase. 변환은 `src/lib/record-mapper.ts`(서버) 또는 client 래퍼에서만 한다

### UI 문구

- PRD §3·§5에 적힌 한국어 문구를 **글자 그대로** 사용한다. 예: "카메라 권한이 필요합니다", "자동 인식 실패, 직접 입력해주세요", "지원하지 않는 이미지 형식입니다. 다시 촬영해주세요", "사진 없이 저장하시겠습니까?", "중복 기록이 있습니다", "선택한 기간에 기록이 없습니다", "기간을 좁혀주세요", "기록을 찾을 수 없습니다"

## 5. 기능 구현 규칙

### 5.1 데이터·시간

- ✅ `created_at`/`updated_at`은 항상 `nowKstIso()` 값(`YYYY-MM-DDTHH:mm:ss+09:00`)을 명시적으로 INSERT/UPDATE 한다
- ❌ SQLite `datetime('now','localtime')`, `CURRENT_TIMESTAMP`, 컬럼 DEFAULT 시각을 사용하지 않는다
- 기간 비교: `created_at >= '{from}T00:00:00+09:00' AND created_at < '{to+1일}T00:00:00+09:00'` (문자열 비교)
- DB 연결은 `getDb()` 첫 호출 시 생성, `globalThis` 싱글턴, `PRAGMA journal_mode = WAL`. import 시점에 DB를 열지 않는다(빌드 시 `data/app.db` 생성 금지)
- 스키마 변경은 `CREATE ... IF NOT EXISTS` + `PRAGMA user_version` 증가로 처리한다
- 모든 SQL은 prepared statement + 바인딩. 문자열 연결로 SQL을 만들지 않는다
- 검색은 `LIKE ... ESCAPE '\'`로 `%`, `_`, `\`를 이스케이프하고 대소문자 무시

### 5.2 기록 규칙

- `raw_text`는 생성 후 **절대 변경하지 않는다**. PATCH 스키마에 `raw_text`를 넣지 않는다
- 직접 입력으로 원문이 없으면 `raw_text = '[직접입력]'` (Q7)
- 중복(trim 후 `product_no`+`lot` 대소문자까지 일치)은 **저장을 막지 않는다**. `POST` 응답에 `duplicate: true`만 담는다. PATCH에서는 중복 검사하지 않는다 (Q4, Q9)
- 사진은 둘 다 선택 항목. 누락 시 확인 모달만 띄우고 저장 허용

### 5.3 사진 파일

- 파일명: `crypto.randomUUID()` + `.jpg`. DB에는 **파일명만** 저장, 경로는 저장하지 않는다
- 허용 형식 `image/jpeg`, `image/png`, 서버 상한 5MB. MIME과 **매직 바이트**를 모두 검사한다 (Q8)
- `GET /api/photos/[file]`: 정규식 `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$` 불일치 시 **파일시스템 접근 전에** `400 INVALID_FILENAME`. 일치해도 `path.resolve` 결과가 `UPLOAD_DIR` 하위인지 재확인
- 생성 실패 시 이미 저장한 사진을 롤백 삭제한다
- 교체 순서: **새 파일 저장 → DB 갱신 성공 → 기존 파일 삭제**. DB 실패 시 새 파일만 지우고 기존 파일 보존
- 삭제 시 DB row와 사진 파일 2개를 함께 삭제. 파일이 없으면(`ENOENT`) 로그만 남기고 성공 처리
- 클라이언트 리사이즈: 긴 변 `RESIZE_MAX_EDGE`(1600), JPEG 품질 `RESIZE_JPEG_QUALITY`(0.8), 출력은 항상 `image/jpeg`. canvas 디코딩 실패 시 슬롯을 비우고 오류 문구 표시
- 촬영 입력은 `<input type="file" accept="image/*" capture="environment">`만 사용한다

### 5.4 API

- 모든 Route Handler는 입력을 Zod(`src/lib/schemas/*`)로 **서버에서 재검증**한다
- 에러 응답은 반드시 `apiError()`로 만든다: `{ "error": { "code", "message", "fields"? } }`
- 상태 코드·에러 코드는 PRD §4를 따른다: `400 VALIDATION_ERROR`, `400 INVALID_FILENAME`, `404 NOT_FOUND`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 TOO_MANY_RECORDS`, `500 INTERNAL_ERROR`. 새 코드를 추가하면 `src/lib/types/api.ts`의 `ApiErrorCode`도 수정
- 동적 파라미터는 `{ params }: { params: Promise<{ id: string }> }` 후 `await params`
- 생성/수정은 `multipart/form-data` + `request.formData()`. Server Actions로 대체하지 않는다
- `GET /api/records`는 `q`, `limit`(기본 20, 최대 100), `offset`, `from`/`to`(Q6, 건수 확인용)를 받는다
- Excel: 500건 초과 시 서버가 `422` 강제(화면 검사와 별개). 헤더 `Content-Disposition: attachment; filename="records_{from}_{to}.xlsx"`

### 5.5 QR 파서

- `parseQr(rawText): { productNo, lot, matchedRule }` 순수 함수 유지. DOM·Node 전용 API 사용 금지
- 규칙은 `QR_RULES` 배열에 `QrRule { name, parse }`로 등록. 새 규칙은 배열에 **추가만** 한다(기존 규칙 수정 최소화)
- 두 값 중 하나라도 비면 해당 규칙 실패. 결과는 trim
- 규칙을 추가·수정하면 `scripts/check-qr-parser.ts`의 샘플 표도 함께 갱신한다

### 5.6 화면 (UI)

- 모바일 세로 기준 단일 컬럼(최대 폭 약 480px, 좌우 16px). 터치 영역 **최소 48px**
- 내비게이션: 하단 탭 바(홈/스캔/내보내기). 스캔 진행 중에는 숨긴다 (Q10)
- 화면 컴포넌트는 데이터·콜백을 **props로 받는 표현 컴포넌트**로 작성한다. Phase 4·5에서는 데이터 공급원만 교체하고 마크업을 다시 쓰지 않는다
- Phase 2 화면 상태 전환은 `src/lib/preview-state.ts`의 `?preview=` 헬퍼로만 한다. 프로덕션에서는 무시되어야 한다
- 날짜 입력은 `<input type="date">` + shadcn `Input` 스타일. shadcn `calendar`는 추가하지 않는다
- 토스트는 sonner만 사용. 루트 `layout.tsx`의 `<Toaster />`, `ThemeProvider`는 유지
- 색상은 CSS 변수 토큰(`bg-background`, `text-muted-foreground` 등)만 사용하고 라이트/다크 둘 다 확인

## 6. 라이브러리 사용 규칙

| 라이브러리       | 규칙                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `better-sqlite3` | 서버 전용 모듈에서만 import. `next.config.ts`에 `serverExternalPackages: ['better-sqlite3']` 필수                                 |
| `@zxing/browser` | `'use client'` 컴포넌트(`src/components/scanner/qr-scanner.tsx`)에서만 사용. `facingMode: 'environment'`. 언마운트 시 스트림 정지 |
| `exceljs`        | `src/lib/excel-export.ts`에서만 사용. 이미지는 `workbook.addImage` + `worksheet.addImage(..., { editAs: 'oneCell' })`             |
| Zod              | v4. 스키마 파일에는 서버 전용 코드 금지(클라이언트 폼이 같은 파일을 import)                                                       |
| React Hook Form  | `zodResolver`로 `src/lib/schemas/*` 스키마 재사용. 폼 전용 스키마를 따로 만들지 않는다                                            |
| shadcn/ui        | `npx shadcn@latest add <name>`으로 추가. `src/components/ui/*` 직접 대량 수정 금지(변형 추가는 허용)                              |
| lucide-react     | 아이콘은 lucide만 사용                                                                                                            |
| 신규 의존성      | ROADMAP Task 002 목록 외 패키지는 추가 전 사용자 확인                                                                             |

- 라이브러리 API는 Context7 MCP로 최신 문서를 확인한 뒤 사용한다

## 7. 워크플로우

```
ROADMAP Task 확인 → tasks/XXX-*.md 작성(또는 읽기) → 구현 → 단계별 진행 체크
 → (API/로직) Playwright MCP 테스트 → npm run check-all → npm run build
 → tasks 파일에 체크·변경 요약 → ROADMAP 상태 [x] + "See: /tasks/XXX-xxx.md" → 멈추고 지시 대기
```

- Task 파일명: `tasks/XXX-description.md`(예: `004-sqlite-repo.md`). 최초 작업 시 `tasks/000-sample.md` 템플릿 생성
- 새 Task 파일은 직전 완료 Task 파일 2개를 참고해 형식을 맞춘다
- API·비즈니스 로직 Task 파일에는 **`## 테스트 체크리스트`** 섹션(Playwright MCP 시나리오)을 반드시 포함한다
- 화면 확인은 `browser_resize` 375x812, 390x844 뷰포트 기준
- **각 단계 완료 후 멈추고 사용자 지시를 기다린다.** 다음 Task를 임의로 시작하지 않는다
- **진행 순서: Phase 2(웹 UI, 더미 데이터, Task 004~008) → Task 008-1(UX 검토·보완) → Phase 3(데이터·API, Task 009~012)**. 순차 진행하고 병행하지 않는다
- Phase 2 작업 중 API를 호출하지 않는다. `fetch`, `records-client`, Route Handler를 쓰지 않고 `src/lib/mock/records.ts`, `public/mock/`, `?preview=`만 사용한다
- Task 003의 타입·스키마는 확정본이 아니다. Task 008-1에서 나온 보완 사항을 PRD/ROADMAP·타입·스키마에 반영한 뒤에 Phase 3을 시작한다
- 커밋은 사용자가 요청할 때만. 형식은 `/git:commit`(이모지 + 컨벤셔널, 한국어)

## 8. 파일 동시 수정 규칙

| 이 파일을 바꾸면                               | 함께 수정                                                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PRD.md` 요구사항                         | `docs/ROADMAP.md` 관련 Task·추적표(F·S 코드), 영향받는 `tasks/*.md`                                                                                 |
| 제한 수치(5MB, 1600px, 0.8, 20, 100, 200, 500) | `src/lib/constants.ts` **한 곳만**. 코드에 숫자 리터럴 중복 금지                                                                                    |
| DB 스키마(`db.ts`)                             | `src/lib/types/record.ts`, `src/lib/schemas/record.ts`, `record-mapper.ts`, `src/lib/mock/records.ts`, `excel-export.ts`(컬럼), `user_version` 증가 |
| Zod 스키마                                     | 해당 Route Handler, 클라이언트 폼, `*-client.ts`                                                                                                    |
| API 응답 형식                                  | `src/lib/types/*`, `src/lib/api/*-client.ts`, PRD §4                                                                                                |
| 에러 코드                                      | `src/lib/types/api.ts` `ApiErrorCode`, `api-error.ts`                                                                                               |
| `qr-parser.ts` 규칙                            | `scripts/check-qr-parser.ts`                                                                                                                        |
| 폴더·파일 추가/삭제                            | `docs/guides/project-structure.md`                                                                                                                  |
| 의존성 추가                                    | `package.json` + `package-lock.json` (npm으로 설치)                                                                                                 |
| 환경변수 추가                                  | `src/lib/env.ts` 스키마                                                                                                                             |
| 확인 필요 항목(Q1~Q10) 답변 수신               | `docs/ROADMAP.md` 표 상태 + 영향받는 Task 항목                                                                                                      |
| Task 완료                                      | `tasks/XXX-*.md` 체크 + `docs/ROADMAP.md` 진행 현황 표                                                                                              |

## 9. AI 결정 기준

1. PRD에 명시되어 있는가? → PRD를 따른다
2. PRD에 없고 ROADMAP Q1~Q10에 임시 기본값이 있는가? → 기본값을 따르고, 코드 주석에 `(ROADMAP Qn)`을 남긴다
3. 둘 다 없고 되돌리기 쉬운 결정인가? → 가장 단순한 방법으로 진행하고 `tasks/XXX-*.md`에 "확인 필요"로 기록
4. 데이터 모델·API 계약·보안·범위 외 기능에 영향을 주는가? → **구현을 멈추고 사용자에게 확인**

- 파일을 서버/클라이언트 어디에 둘지 모호하면: DB·파일시스템·`exceljs` 접근 → 서버 전용(`server-only`), 카메라·canvas·`File` 리사이즈 → `'use client'`, 둘 다 아님 → 공용 순수 모듈
- 컴포넌트 위치가 모호하면: 한 라우트에서만 사용 → `_components/`, 두 곳 이상 → `src/components/{카테고리}/`
- PRD와 ROADMAP이 충돌하면 PRD 우선. 단, Task 번호·파일 경로는 ROADMAP 우선

## 10. 금지 사항

- ❌ `data/`, `.env*`를 커밋하거나 `.gitignore`에서 제외 해제
- ❌ `raw_text` 수정 경로 추가
- ❌ SQLite 기본 시각 함수로 `created_at`/`updated_at` 생성
- ❌ 중복 기록 저장 차단
- ❌ 사진 파일명 정규식 검사 전 파일시스템 접근, 사용자 입력으로 경로 직접 조합
- ❌ 기존 사진을 새 파일 저장·DB 갱신 성공 전에 삭제
- ❌ 클라이언트 검증만으로 끝내기(서버 Zod 재검증 생략)
- ❌ `apiError()`를 거치지 않은 임의 에러 JSON
- ❌ 서버 전용 모듈을 `'use client'` 파일에서 import, 스키마 파일에 서버 코드 포함
- ❌ 제한 수치를 `constants.ts` 밖에 하드코딩
- ❌ 로그인·인증, 오프라인 동기화, 3장 이상 사진 등 범위 외 기능 구현
- ❌ `src/pages/` Pages Router 사용, 새 라우트 임의 추가
- ❌ `params`를 `await` 없이 동기 접근
- ❌ Phase 2 UI에서 실제 API·카메라 연결 (Phase 4·5 작업)
- ❌ Task 008-1 보완 반영 전에 Phase 3(API·DB) 착수
- ❌ `npm run check-all`·`npm run build` 실패 상태로 Task 완료 처리
- ❌ 사용자 요청 없이 커밋·푸시, 다음 Task 자동 진행
