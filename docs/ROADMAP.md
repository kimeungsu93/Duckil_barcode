# Duckil Barcode 개발 로드맵

현장 작업자가 휴대폰 하나로 제품 QR 스캔부터 사진 기록, 사진이 들어간 Excel 보고서까지 30초 안에 끝내도록 만드는 사내 웹앱 MVP.

> 요구사항의 기준 문서는 `docs/PRD.md`입니다. 완료 조건에 적힌 `F1-1` 같은 코드는 PRD §3 수용 기준 번호이고(아래 "PRD 수용 기준 추적표" 참고), `S-홈-1` 같은 코드는 PRD §5 화면별 상태 번호입니다(아래 "화면 상태 추적표" 참고).

## 개요

Duckil Barcode는 입고/검수/출하 현장 작업자(로그인 없음)를 위해, 라벨 정보를 옮겨 적을 때 생기는 오기·누락과 보고 자료를 손으로 취합하는 시간을 없애는 휴대폰 웹앱입니다. 다음 기능을 제공합니다.

- **코드 스캔**: PDA 하드웨어 스캐너(키보드 웨지) 입력을 기본으로 받고, PDA가 안 될 때는 후면 카메라로 QR/Data Matrix/주요 1D 바코드를 인식. 원문(`raw_text`)은 항상 그대로 보관하고, 같은 원본 바코드는 다시 저장하지 못하게 막음 (Phase 7)
- **Product No / Lot 자동 추출**: 교체 가능한 파서 모듈(`src/lib/qr-parser.ts`)로 자동 입력하고, P/NO는 제출 표 형식(`84739-DC000(G2E)`)으로 변환. 실패하면 직접 입력
- **사진 기록**: 바코드 사진·제품 사진·점등 사진(Phase 7 추가)을 1장씩 촬영하고, 클라이언트에서 리사이즈(긴 변 1600px, JPEG 0.8)해 업로드
- **기록 관리**: SQLite(`data/app.db`) + 파일시스템(`data/uploads/`)에 저장하고, 목록·검색·상세·수정·삭제 제공
- **Excel 내보내기**: 기간을 골라 사진 썸네일이 셀에 들어간 `.xlsx` 파일을 휴대폰에서 바로 다운로드. No는 파일 안 순번, 행은 스캔 순서, 사진은 원본 비율 유지

**기술 스택**: Next.js 15.5.3 (App Router + Turbopack), React 19.1, TypeScript 5, TailwindCSS v4, shadcn/ui(new-york), React Hook Form + Zod, sonner, `better-sqlite3`, `@zxing/browser`, `exceljs`, Node.js 24.16

## 전체 흐름

```
Phase 1 기반 정리 ──▶ Phase 2 웹 화면 UI (더미 데이터) ──▶ [UX 검토·보완 반영] ──▶ Phase 3 데이터·API (백엔드) ──▶ Phase 4 스캔·촬영·저장 기능 연결 ──▶ Phase 5 목록·상세·내보내기 기능 연결 ──▶ Phase 6 현장 적용 ──▶ Phase 7 현장 테스트 피드백 반영
```

- **화면 UI(Phase 2)를 데이터·API(Phase 3)보다 먼저, 순서대로 진행**합니다. 더미 데이터로 전체 화면과 사용자 흐름을 먼저 만들어 보고, 부족한 점이 드러나면 API 명세·데이터 모델을 확정하기 전에 보완하기 위해서입니다.
- Phase 2에서는 **API를 호출하지 않습니다.** 화면 데이터는 Task 003의 더미 데이터(`src/lib/mock/records.ts`, `public/mock/`)만 쓰고, 화면 상태는 개발 모드의 `?preview=<상태>` 쿼리로 전환합니다. 공통 타입·Zod 스키마는 Task 003에서 만든 것을 쓰되, UX 검토 결과에 따라 바뀔 수 있습니다.
- Phase 2의 마지막 Task 008-1(UX 검토 및 보완 사항 정리)에서 더미 화면으로 발견한 부족한 점과 API 명세·데이터 모델·Zod 스키마·확인 필요 사항(Q1~Q10) 변경점을 정리해 PRD/ROADMAP에 반영했습니다. 이어서 Task 008-2에서 사용자가 준 참고 자료(제출 표·라벨 사진)에 맞춰 화면 문구와 더미 데이터를 보완한 뒤 Phase 3을 시작합니다.
- 그다음 실제 API(Phase 3)를 만들고, 화면에 실제 API와 브라우저 기능(카메라, 리사이즈)을 연결합니다(Phase 4·5).
- Phase 7은 실사용 테스트에서 나온 개선 요청을 반영합니다. PDA 스캐너 입력을 기본으로 바꾸고(카메라는 대체 수단), 같은 원본 바코드의 중복 저장을 막고, 사진을 3장(점등 사진 추가)으로 늘립니다. 폐쇄망 CSS 미적용 건은 원인이 확정되지 않아 이번 범위에서 뺐습니다(Q22).

## 진행 현황

| Phase | Task  | 제목                                                            | 의존               | 상태                              |
| ----- | ----- | --------------------------------------------------------------- | ------------------ | --------------------------------- |
| 1     | 001   | 스타터 예제 코드 정리 및 라우트 골격 생성                       | -                  | [x]                               |
| 1     | 002   | 의존성 설치 및 개발·빌드 환경 설정                              | 001                | [x]                               |
| 1     | 003   | 공통 타입·Zod 스키마·상수·KST 유틸·더미 데이터 정의             | 002                | [x]                               |
| 2     | 004   | 공통 UI 기반 구축 (모바일 레이아웃·탭 내비게이션·상태 컴포넌트) | 003                | [x]                               |
| 2     | 005   | 홈 화면 UI 구현 (더미 데이터)                                   | 004                | [x]                               |
| 2     | 006   | 스캔 화면 단계형 UI 구현 (더미 데이터)                          | 004                | [x]                               |
| 2     | 007   | 상세 화면 UI 구현 (더미 데이터)                                 | 004, 006           | [x]                               |
| 2     | 008   | 내보내기 화면 UI 구현 (더미 데이터)                             | 004                | [x]                               |
| 2     | 008-1 | UX 검토 및 보완 사항 정리 (API 착수 전 PRD/ROADMAP 반영)        | 005, 006, 007, 008 | [x]                               |
| 2     | 008-2 | 참고 자료 반영 화면·더미 데이터 보완                            | 008-1              | [x]                               |
| 3     | 009   | SQLite 초기화 모듈 및 기록 리포지토리 구현                      | 003, 008-1, 008-2  | [x]                               |
| 3     | 010   | 사진 저장소 유틸 및 `GET /api/photos/[file]` 구현               | 003, 008-1, 008-2  | [x]                               |
| 3     | 011   | 기록 CRUD API 구현                                              | 009, 010, 008-2    | [x]                               |
| 3     | 012   | Excel 내보내기 API 구현                                         | 009, 010, 008-2    | [x]                               |
| 4     | 013   | QR 파서 모듈 구현 (교체 가능 구조 + 기본 규칙)                  | 003                | [x]                               |
| 4     | 014   | QR 스캐너 카메라 로직 구현 (권한·미지원 처리)                   | 006                | [x]                               |
| 4     | 015   | 사진 리사이즈 로직 구현 및 사진 슬롯 연결                       | 006                | [x]                               |
| 4     | 016   | `/scan` 저장 흐름 연결                                          | 011, 013, 014, 015 | [x]                               |
| 5     | 017   | 홈 화면 API 연결 (목록·검색·페이지네이션)                       | 005, 011           | [x]                               |
| 5     | 018   | 상세 화면 API 연결 (수정·재촬영·삭제)                           | 007, 011, 015      | [x]                               |
| 5     | 019   | 내보내기 화면 API 연결                                          | 008, 011, 012      | [x]                               |
| 5     | 020   | 핵심 흐름 통합 E2E 테스트                                       | 016, 017, 018, 019 | [x]                               |
| 6     | 021   | 실제 QR 샘플 기반 파서 규칙 추가                                | 013, 샘플 확보     | [ ] 측정 준비 완료, 샘플 대기(Q1) |
| 6     | 022   | 휴대폰 실기기 테스트 (iOS Safari, Android Chrome)               | 020                | [ ]                               |
| 6     | 023   | 사내 서버 배포 및 운영 가이드 작성                              | 020                | [ ]                               |
| 7     | 024   | PDA 스캐너 입력 기본 전환 (카메라는 대체)                       | 014, 016           | [ ]                               |
| 7     | 025   | 원본 바코드(`raw_text`) 중복 등록 차단                          | 009, 011, 016      | [ ]                               |
| 7     | 026   | 점등 사진 추가 (사진 3장·엑셀 9컬럼)                            | 010, 011, 012, 018 | [ ]                               |
| 7     | 027   | Phase 7 통합 검증                                               | 024, 025, 026      | [ ]                               |

**Phase 완료 현황**

- [x] Phase 1: 기반 정리 및 앱 골격 구축
- [x] Phase 2: 웹 화면 UI 구현 - 더미 데이터 (API 호출 없음) - 완료
- [x] Phase 3: 데이터 계층 및 API 구축 - 완료
- [x] Phase 4: 스캔·촬영·저장 기능 연결 - 완료
- [x] Phase 5: 목록·상세·내보내기 기능 연결 - 완료
- [ ] Phase 6: 현장 적용
- [ ] Phase 7: 현장 테스트 피드백 반영

**진행 순서와 병렬 진행 가능 구간**

- Phase 2(화면 UI, Task 004~008-2) → Phase 3(백엔드, Task 009~012)는 순서대로 진행합니다. Phase 3은 Task 008-1의 보완 사항이 PRD/ROADMAP에 반영되고, Task 008-2(참고 자료 반영)가 끝난 뒤 시작합니다.
- Phase 2 안에서는 Task 004가 끝나면 Task 005·006·008을 동시에 진행할 수 있습니다(Task 007은 Task 006의 공용 컴포넌트를 재사용).
- Task 013(QR 파서)은 순수 함수라 Task 003 이후 언제든 진행할 수 있습니다.
- Phase 4의 Task 014·015는 API 없이 화면(Task 006)만 있으면 되므로 Phase 3이 끝나기 전에 시작할 수 있습니다.
- Phase 5의 Task 017·018·019는 서로 독립적입니다.
- Phase 7의 Task 024(입력 방식)·025(중복 차단)·026(점등 사진)은 서로 독립적으로 진행할 수 있습니다. 다만 025와 026이 둘 다 `scan-flow.tsx`·`records-repo.ts`·`db.ts`를 고치므로 병합 순서를 정하고, DB 마이그레이션 번호는 병합한 순서대로 v2(`raw_key`), v3(`lighting_photo`)로 붙입니다. Task 027은 세 Task가 모두 끝난 뒤 진행합니다.

## 확인 필요 사항 (PRD §10 미결 사항)

아래 항목은 사용자 답변을 받지 못했으므로 **PRD의 현재 기본값으로 진행**합니다. 답변을 받으면 연결된 Task의 해당 항목만 수정합니다. Task 008-1(UX 검토)에서 더미 화면을 보고 기본값을 다시 점검하고, 바꿀 항목이 있으면 Phase 3 시작 전에 이 표와 연결된 Task에 반영합니다.

| #   | 항목                                         | 현재 기본값 (PRD 기준)                                                                                                                                                                                                                                                                                                                                     | 영향받는 Task                | 상태                 |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------- |
| Q1  | 실제 QR 샘플 원문 (Product No/Lot 위치)      | 기본 3규칙(`키:값`/`키=값` → GS1 AI → 구분자 위치 분리) 순서로 시도, 실패 시 직접 입력 (PRD §3 F2). 참고 라벨 사진은 확보(2026-09-29), 원문 문자열은 미확보. Lot은 날짜+일련번호(`2608200040`), 시리얼 필드 없음                                                                                                                                           | 006, 008-2, 013, 016, 021    | 일부 확보(라벨 사진) |
| Q2  | 사내 서버 OS 타임존                          | DB 기본값에 의존하지 않고 앱 코드에서 KST(`+09:00`) ISO 문자열을 만들어 저장, 프로세스에 `TZ=Asia/Seoul` 고정 (PRD §6, §8)                                                                                                                                                                                                                                 | 003, 009, 012, 023           | 확인 필요            |
| Q3  | 내보내기 경고 임계치 200건 / 하드 상한 500건 | 200건 초과 시 확인 모달, 500건 초과 시 `422 TOO_MANY_RECORDS` (PRD §3 F5, §4, §8). 수치는 `src/lib/constants.ts` 한 곳에서만 관리                                                                                                                                                                                                                          | 003, 008, 012, 019, 022      | 확인 필요            |
| Q4  | 중복 경고 시점                               | **저장 후** 경고. 저장은 그대로 진행하고 `POST /api/records` 응답의 `duplicate: true`를 보고 성공 토스트와 별도로 "중복 기록이 있습니다" 경고 토스트 표시 (PRD §2-5, §3 F4, §5). 저장 전 사전 확인은 하지 않음. **Phase 7에서 폐지**: Product No+Lot 중복 경고(`duplicate` 플래그·경고 토스트)를 없애고, 원본 바코드 일치 시 저장 차단으로 대체 (Q19, Q20) | 006, 011, 016, 025           | 폐지 (Phase 7)       |
| Q5  | 재촬영 시 교체 방식                          | 슬롯당 1장 유지. 새 파일을 새 uuid 파일명으로 먼저 저장하고, DB 갱신에 성공한 뒤 기존 파일을 삭제. 교체에 실패하면 기존 파일을 보존 (PRD §3 F3·F4, §4 PATCH)                                                                                                                                                                                               | 006, 007, 010, 011, 015, 018 | 확인 필요            |

PRD §10의 나머지 항목(서버 OS/Node 설치 가능 여부·HTTPS 인증서 방식, 작업자 이름 등 추가 기록 항목)도 답변을 기다리는 중입니다. 인증서 방식은 Task 023, 추가 기록 항목은 Task 003·009(스키마)와 Task 006·007(입력 폼)에 영향을 줍니다.

**로드맵 작성 중 추가로 발견한 확인 필요 사항** (PRD에 명시되지 않아 임시 기본값을 정함)

| #   | 항목                                                                                                                                 | 임시 기본값                                                                                                                                                                                        | 영향받는 Task        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Q6  | 내보내기 전 건수 확인 방법. PRD에 건수 조회 API가 없는데, 화면은 다운로드 전에 0건/200건 초과 여부를 알아야 함                       | `GET /api/records`에 선택 쿼리 `from`/`to`(YYYY-MM-DD)를 추가하고 `limit=1`로 호출해 `total`만 사용                                                                                                | 011, 019             |
| Q7  | 직접 입력 시 `raw_text` 값. `raw_text`는 필수(1~2000자)인데 카메라 없이 직접 입력하면 원문이 없음                                    | 직접 입력 화면에 "QR 원문(선택)" 입력란을 두고, 비어 있으면 `[직접입력]` 고정 문자열을 저장                                                                                                        | 006, 014, 016        |
| Q8  | PNG 업로드 처리. 서버는 `image/png`를 허용하지만, 사진 파일명 규칙은 `uuid.jpg`만 허용하고 응답 `Content-Type`도 `image/jpeg`로 고정 | 파일명은 PRD대로 `{uuid}.jpg`로 유지. 저장 시 매직 바이트로 실제 형식을 검사하고, `GET /api/photos`는 매직 바이트 기준으로 `Content-Type`을 설정 (정상 경로에서는 클라이언트 리사이즈로 항상 JPEG) | 010, 011             |
| Q9  | 중복 판정 기준                                                                                                                       | trim 후 `product_no`와 `lot`이 대소문자까지 정확히 일치할 때 중복. `PATCH`로 수정할 때는 중복 검사를 하지 않음. **Phase 7에서 폐지**: 중복 기준을 원본 바코드(`raw_key`)로 바꿈 (Q19, Q20)         | 009, 011, 025        |
| Q10 | 내비게이션 형태                                                                                                                      | 하단 탭 바(홈/스캔/내보내기) + 화면별 상단 헤더(제목, 뒤로 가기). 스캔 진행 중에는 탭 바를 숨겨 카메라 영역 확보                                                                                   | 004, 006             |
| Q11 | 상세 화면 사진 삭제(비우기). PRD `PATCH`는 사진 교체만 정의 (Task 008-1에서 발견)                                                    | 상세 화면에서는 교체(재촬영)만 제공하고 비우기 버튼을 숨김. `PATCH`는 사진 삭제 필드를 받지 않음. 스캔 화면(저장 전)의 비우기는 유지                                                               | 007, 011, 018        |
| Q12 | 내보내기 대상 건수를 언제 보여줄지 (Task 008-1에서 발견)                                                                             | 다운로드 버튼을 누를 때만 건수를 확인(Q6 방식 1회 호출). 기간을 바꿀 때마다 미리 조회하지 않음                                                                                                     | 008, 019             |
| Q13 | 검색과 중복 판정의 대소문자 기준이 다름 (Task 008-1에서 발견)                                                                        | 그대로 유지. 검색은 대소문자 무시(F4-3), 중복 판정은 대소문자 구분(Q9). 예: `dk-2001` 검색 시 `DK-2001`도 보이지만 중복은 아님                                                                     | 009, 011, 017        |
| Q14 | 라벨 코드 종류 (참고 자료 반영 중 발견)                                                                                              | 기본값 Data Matrix. Data Matrix + QR + 주요 1D(CODE_128, EAN_13, CODE_39)를 모두 인식                                                                                                              | 014, 022             |
| Q15 | P/NO 표기 변환 규칙 (참고 자료 반영 중 발견)                                                                                         | 대문자 변환 후 `^(\d{5})([A-Z0-9]{5})([A-Z0-9]+)$`일 때만 `$1-$2($3)`로 변환(예: `84739DC000G2E` → `84739-DC000(G2E)`). 이미 표 형식이거나 맞지 않으면 원본 그대로. `raw_text`는 변환하지 않음     | 008-2, 013, 016, 021 |
| Q16 | 내보내기 정렬·순번 (참고 자료 반영 중 발견)                                                                                          | 정렬 `created_at ASC, id ASC`(스캔 순서), No는 파일 안에서 1부터 순번(DB id 아님)                                                                                                                  | 009, 012             |

**Phase 7 (현장 테스트 피드백 반영) 확인 필요 사항**

| #   | 항목                                       | 현재 기본값                                                                                                                                                                                                                                                                                                        | 영향받는 Task | 상태           |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | -------------- |
| Q17 | PDA 입력 방식                              | 키보드 웨지 방식이고 스캔 끝에 Enter가 붙는다(사용자 답변). 보이는 입력란에 자동 포커스하고 Enter가 오면 원문을 확정. Enter 접미사가 없는 기종은 고려하지 않음                                                                                                                                                     | 024, 027      | 현장 확인 필요 |
| Q18 | PDA 제어문자(GS·RS·EOT) 출력 방식          | PDA가 제어문자를 대체 문자(예: `<GS>`)로 보낼 수 있다고 보고 `normalizeWedgeText()`에서 원래 제어문자로 되돌린 뒤 `parseIso15434`에 넘김. 실기기의 대체 문자 종류는 현장에서 확인 후 변환표에 추가                                                                                                                 | 024, 027      | 현장 확인 필요 |
| Q19 | 중복 판정 기준 (Q9 대체)                   | `raw_key` = 원문에서 제어문자를 지우고 trim한 값. `raw_key`가 같으면 저장 차단(경고 다이얼로그 + 서버 `409 DUPLICATE_RAW_TEXT`). 카메라 원문(제어문자 포함)과 PDA 원문이 같은 키가 됨. 직접 입력 원문 `[직접입력]`은 `raw_key = NULL`이라 검사 대상에서 제외. `PATCH`는 `raw_text`를 바꾸지 않으므로 검사하지 않음 | 025, 027      | 결정 (사용자)  |
| Q20 | 기존 Product No+Lot 중복 경고 (Q4·Q9)      | **폐지**. `POST` 응답의 `duplicate` 플래그, "중복 기록이 있습니다" 경고 토스트, `existsByProductLot`를 제거                                                                                                                                                                                                        | 025           | 결정 (사용자)  |
| Q21 | 운영 DB에 이미 같은 원문이 여러 건 있을 때 | 마이그레이션 v2에서 중복이 없으면 부분 UNIQUE 인덱스(`WHERE raw_key IS NOT NULL`)를 만들고, 중복이 있으면 일반 인덱스 + `console.warn` 경고 로그로 앱이 정상 기동되게 함. 새 중복은 앱의 사전 조회로 막음. 기존 중복 묶음은 `scripts/check-duplicate-raw.ts`로 출력해 정리 여부를 사용자와 결정                    | 025, 027      | 확인 필요      |
| Q22 | 폐쇄망에서 CSS가 적용되지 않는 문제        | **이번 Phase 범위에서 제외** (원인 미확정). 빌드된 HTML·CSS에 외부 URL이 0건이라 CDN 문제는 아님                                                                                                                                                                                                                   | -             | 원인 조사 대기 |

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - `/tasks` 디렉토리에 새 작업 파일 생성 (현재 디렉토리가 없으므로 Task 001 시작 시 `tasks/000-sample.md`와 함께 생성)
   - 명명 형식: `XXX-description.md` (예: `001-setup.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - **API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)**
   - 예시로 `/tasks` 디렉토리의 마지막 완료된 작업 두 개를 참조 (예: 현재 작업이 `012`라면 `011`, `010`). 완료된 작업 파일은 체크된 박스와 변경 사항 요약을 포함하지만, 새 작업 파일은 빈 박스만 두고 변경 사항 요약은 비워 둠. 초기 상태 샘플은 `000-sample.md` 참조

3. **작업 구현**
   - 작업 파일의 명세서를 따름
   - 기능과 기능성 구현
   - **API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수**
   - 각 단계 후 작업 파일 내 단계 진행 상황 업데이트
   - 구현 완료 후 Playwright MCP를 사용한 E2E 테스트 실행
   - 테스트 통과 확인 후 다음 단계로 진행
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시하고, "진행 현황" 표의 상태를 `[x]`로 변경
   - 완료된 Task에는 `See: /tasks/XXX-xxx.md` 참조 추가

**공통 규칙**

- 모든 Phase는 마지막에 `npm run check-all`과 `npm run build`가 통과해야 완료로 봅니다.
- 파일 경로와 구조는 `docs/guides/project-structure.md`를 따릅니다. 특정 페이지 전용 컴포넌트는 해당 라우트의 `_components/` 폴더에, 여러 페이지에서 쓰는 컴포넌트는 `src/components/{카테고리}/`에 둡니다. 컴포넌트 작성 방식은 `docs/guides/component-patterns.md`, 스타일은 `docs/guides/styling-guide.md`를 따릅니다.
- Route Handler와 동적 페이지의 파라미터는 Next.js 15 규칙대로 `params: Promise<{ ... }>`를 `await`해서 사용합니다 (`docs/guides/nextjs-15.md`).
- Phase 2의 화면 컴포넌트는 데이터와 동작을 props로 받는 표현 컴포넌트로 만들어, Phase 4·5에서 마크업을 다시 쓰지 않고 데이터 공급원만 더미에서 API로 바꿉니다.
- Playwright MCP 테스트용 이미지 샘플(정상 JPEG, PNG, 5MB 초과 파일, 이미지가 아닌 파일, HEIC)은 `tests/fixtures/`에 둡니다. 화면 확인은 375x812, 390x844 뷰포트 기준입니다.

## 개발 단계

### Phase 1: 기반 정리 및 앱 골격 구축

스타터 예제를 걷어내고, 4개 화면의 빈 껍데기와 공통 타입·스키마·더미 데이터를 먼저 만듭니다. 이 Phase가 끝나면 백엔드와 화면 작업을 나눠 진행할 수 있습니다.

- **Task 001: 스타터 예제 코드 정리 및 라우트 골격 생성** ✅ - 완료
  - See: `/tasks/001-starter-cleanup.md`
  - 담당 파일
    - 삭제: `src/app/login/`, `src/app/signup/`, `src/components/login-form.tsx`, `src/components/signup-form.tsx`, `src/components/sections/{hero,features,cta}.tsx`, `src/components/layout/footer.tsx`, `src/components/navigation/main-nav.tsx`, `src/components/navigation/mobile-nav.tsx` (다른 곳에서 쓰지 않는지 확인 후)
    - 수정: `src/app/layout.tsx`(메타데이터), `src/app/page.tsx`, `src/components/layout/header.tsx`(예제 링크 제거만), `docs/guides/project-structure.md`(예제 파일 목록 갱신)
    - 생성: `src/app/scan/page.tsx`, `src/app/records/[id]/page.tsx`, `src/app/export/page.tsx`, `src/app/not-found.tsx`
  - 구현 사항
    - [x] 예제 페이지·컴포넌트 삭제 및 남은 import 정리
    - [x] `layout.tsx` 메타데이터를 "Duckil Barcode"로 변경. `Toaster`(sonner)와 `ThemeProvider`는 유지
    - [x] 라우트 골격: `/`, `/scan`, `/records/[id]`, `/export` 각 페이지에 제목과 "준비 중" 자리표시만 둠. `/records/[id]`는 `params: Promise<{ id: string }>` 형태로 작성
    - [x] `not-found.tsx`에 "페이지를 찾을 수 없습니다" + 홈으로 이동 링크
    - [x] `tasks/000-sample.md` 작업 파일 템플릿 생성
  - 완료 조건
    - [x] 4개 경로에 모두 접근할 수 있고, `/login`, `/signup`은 404다 (Playwright MCP로 확인)
    - [x] 저장소 전체에서 삭제한 컴포넌트를 참조하는 곳이 없다

- **Task 002: 의존성 설치 및 개발·빌드 환경 설정** ✅ - 완료
  - See: `/tasks/002-dev-environment.md`
  - 의존: Task 001
  - 담당 파일: `package.json`, `next.config.ts`, `.gitignore`, `src/lib/env.ts`
  - 구현 사항
    - [x] 런타임 의존성 설치: `better-sqlite3`, `@zxing/browser`, `@zxing/library`(peer), `exceljs`
    - [x] 개발 의존성: `@types/better-sqlite3`, `@types/node`를 Node 24에 맞게 `^24`로 올림
    - [x] `next.config.ts`에 `serverExternalPackages: ['better-sqlite3']` 추가 (PRD §7)
    - [x] `.gitignore`에 `/data/` 추가 (DB와 사진이 커밋되지 않도록)
    - [x] `env.ts`에 `DATA_DIR`(기본 `./data`) 추가, 쓰지 않는 `VERCEL_URL` 제거. `UPLOAD_DIR`은 `DATA_DIR/uploads`로 계산
    - [x] 휴대폰 테스트용 `dev:https` 스크립트 추가 (`next dev --turbopack --experimental-https --hostname 0.0.0.0`, PRD §8)
    - [x] `package.json`에 `"engines": { "node": ">=24.16" }` 명시
  - 완료 조건
    - [x] `npm run build` 시 `better-sqlite3` 번들링 오류가 없다
    - [ ] `npm run dev:https`로 띄운 개발 서버에 같은 Wi-Fi의 기기가 HTTPS로 접속된다 — ⏳ 사용자 확인 필요 (mkcert 키체인 비밀번호 입력, `tasks/002-dev-environment.md` 참고)

- **Task 003: 공통 타입·Zod 스키마·상수·KST 유틸·더미 데이터 정의** ✅ - 완료
  - See: `/tasks/003-shared-types-schemas.md`
  - 의존: Task 002
  - 담당 파일
    - `src/lib/types/record.ts`: `RecordRow`(DB row), `RecordDto`(API 응답, snake_case), `CreateRecordResponse`(= `RecordDto & { duplicate: boolean }`), `RecordListResponse`(`{ items, total }`)
    - `src/lib/types/api.ts`: `ApiErrorBody`(`{ error: { code, message, fields? } }`), `ApiErrorCode` 유니언(`VALIDATION_ERROR`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `NOT_FOUND`, `INVALID_FILENAME`, `TOO_MANY_RECORDS`, `INTERNAL_ERROR`)
    - `src/lib/schemas/record.ts`, `src/lib/schemas/export.ts`, `src/lib/schemas/photo.ts`: Zod 스키마
    - `src/lib/constants.ts`: 제한 수치
    - `src/lib/time.ts`: KST 시간 유틸
    - `src/lib/api-error.ts`: 에러 응답 헬퍼
    - `src/lib/mock/records.ts`, `public/mock/`: 화면 개발용 더미 데이터와 샘플 이미지
  - 구현 사항
    - [x] PRD §4 검증 표를 그대로 Zod로 옮김: `raw_text` 1~2000자, `product_no`/`lot` trim 후 1~100자, `memo` 최대 500자, `id` 정수 1 이상, `from`/`to` `YYYY-MM-DD` + `from <= to`, 사진 파일명 `^[0-9a-f]{8}-...-[0-9a-f]{12}\.jpg$`
    - [x] 목록 쿼리 스키마: `q?`, `limit`(기본 20, 최대 100), `offset`(기본 0), `from?`/`to?`(Q6)
    - [x] 클라이언트 폼(React Hook Form)과 서버(Route Handler)가 같은 스키마를 import하도록 구성. 스키마 파일에는 서버 전용 코드를 넣지 않음
    - [x] `constants.ts`: `PHOTO_MAX_BYTES = 5MB`, `PHOTO_ALLOWED_TYPES`, `RESIZE_MAX_EDGE = 1600`, `RESIZE_JPEG_QUALITY = 0.8`, `LIST_PAGE_SIZE = 20`, `EXPORT_WARN_THRESHOLD = 200`, `EXPORT_HARD_LIMIT = 500` (Q3)
    - [x] `time.ts`: `nowKstIso()`는 서버 OS 타임존과 무관하게 UTC 기준 +9시간을 계산해 `YYYY-MM-DDTHH:mm:ss+09:00`을 반환. `kstDayStart(date)`/`kstNextDayStart(date)`는 내보내기 기간 비교용, `formatKstDisplay(iso)`는 화면 표시용 (Q2)
    - [x] `api-error.ts`: `apiError(status, code, message, fields?)`가 PRD §4 공통 포맷의 `NextResponse.json`을 반환. `ZodError`를 `fields` 맵으로 바꾸는 헬퍼 포함
    - [x] 더미 데이터: `RecordDto` 타입을 따르는 25건 이상(사진 있음/없음, 긴 원문, 메모 있음/없음, 중복 Product No+Lot 포함)
  - 완료 조건
    - [x] 모든 타입·스키마·더미 데이터가 `npm run typecheck`를 통과한다
    - [x] `nowKstIso()`가 `TZ=UTC`와 `TZ=Asia/Seoul` 두 환경에서 같은 결과를 낸다 (Node 스크립트로 확인)

**Phase 1 완료 조건**

- [x] `npm run check-all` 통과
- [x] `npm run build` 통과
- [x] Playwright MCP로 4개 라우트 접근 확인

### Phase 2: 웹 화면 UI 구현 - 더미 데이터 (API 호출 없음)

모든 화면의 마크업·스타일·상태 표시를 Task 003의 더미 데이터로 먼저 완성합니다. API, 카메라, 이미지 리사이즈는 아직 연결하지 않습니다. 화면별 상태는 개발 모드에서만 `?preview=<상태>` 쿼리로 전환해 확인하고, 프로덕션 빌드에서는 이 쿼리를 무시합니다.

- **이 Phase에서는 API를 호출하지 않습니다.** `fetch`, `records-client`, Route Handler를 쓰지 않고, 화면 데이터는 Task 003의 더미 데이터(`src/lib/mock/records.ts`, `public/mock/`)만 사용합니다. 저장·삭제·다운로드 같은 동작은 props 콜백으로만 두고, 더미 동작(토스트 표시, 상태 전환)으로 흐름을 확인합니다.
- 화면 상태 전환은 `?preview=<상태>` 쿼리(Task 004의 `preview-state.ts`)로만 합니다.
- 공통 타입·Zod 스키마는 Task 003에서 만든 것을 쓰되, 확정본이 아닙니다. 화면을 만들며 발견한 부족한 점은 Task 008-1에서 정리해 타입·스키마·API 명세에 반영합니다.
- Phase 2가 끝나면 Task 008-1의 보완 사항을 PRD/ROADMAP에 반영하고 Task 008-2(참고 자료 반영)를 마친 뒤 Phase 3(데이터·API)을 시작합니다.

- **Task 004: 공통 UI 기반 구축 (모바일 레이아웃·탭 내비게이션·상태 컴포넌트)** ✅ - 완료
  - See: `/tasks/004-common-ui.md`
  - 의존: Task 003
  - 담당 파일
    - 수정: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/layout/header.tsx` → `src/components/layout/app-header.tsx`로 교체, `src/components/layout/container.tsx`
    - 생성: `src/components/navigation/bottom-tab-bar.tsx`, `src/components/states/list-skeleton.tsx`, `src/components/states/empty-state.tsx`, `src/components/states/error-state.tsx`, `src/components/dialogs/confirm-dialog.tsx`, `src/lib/preview-state.ts`
    - shadcn 추가: `src/components/ui/alert-dialog.tsx`, `src/components/ui/textarea.tsx`
  - 구현 사항
    - [x] `layout.tsx`: `viewport`(width=device-width, initial-scale=1, `viewport-fit=cover`) 설정, 세로 화면 기준 단일 컬럼(최대 폭 약 480px, 좌우 16px 여백), 하단 탭 바 높이와 iOS 안전 영역(`env(safe-area-inset-bottom)`)만큼 본문 하단 여백
    - [x] `bottom-tab-bar.tsx`: 홈(`/`)·스캔(`/scan`)·내보내기(`/export`) 3개 탭, 현재 경로 강조(`usePathname`), 각 탭 터치 영역 최소 48x48px, Lucide 아이콘 + 한글 라벨 (Q10)
    - [x] `app-header.tsx`: 화면 제목, 선택적 뒤로 가기 버튼(상세 화면용), 테마 토글
    - [x] 공통 상태 컴포넌트: 목록 스켈레톤, 빈 목록(아이콘·문구·주요 행동 버튼 슬롯), 오류 안내(문구 + **다시 시도** 버튼 슬롯), 확인 모달(`AlertDialog` 기반, 제목·설명·확인·취소 props)
    - [x] 버튼 기본 크기를 모바일 기준(높이 48px 이상)으로 쓰는 `size="touch"` 변형 추가 또는 사용 규칙 정리 (PRD §8)
    - [x] 날짜 입력은 휴대폰 기본 달력이 뜨는 `<input type="date">`를 shadcn `Input` 스타일로 사용하기로 정리 (shadcn `calendar`는 추가하지 않음, 필요 시 Task 008에서 재검토)
    - [x] `preview-state.ts`: 개발 모드에서만 `searchParams.preview` 값을 읽어 주는 헬퍼
  - 완료 조건
    - [x] 4개 화면 모두 공통 레이아웃과 하단 탭 바가 적용되고, 탭 이동과 현재 탭 강조가 동작한다
    - [x] 375x812 뷰포트에서 가로 스크롤이 없고, 탭·버튼 터치 영역이 48px 이상이다
    - [x] 공통 상태 컴포넌트 4종이 라이트/다크 테마 모두에서 읽을 수 있다
  - 화면 확인 (Playwright MCP): `browser_resize`로 375x812 설정 → 각 탭 이동 → `browser_take_screenshot`으로 레이아웃 기록, `browser_evaluate`로 탭 요소 크기 측정

- **Task 005: 홈 화면 UI 구현 (더미 데이터)** ✅ - 완료
  - See: `/tasks/005-home-ui.md`
  - 의존: Task 004
  - 담당 파일: `src/app/page.tsx`, `src/app/_components/home-view.tsx`, `src/app/_components/record-list.tsx`, `src/app/_components/record-list-item.tsx`, `src/app/_components/record-search.tsx`
  - 구현 사항
    - [x] 상단에 큰 **스캔 시작** 버튼(엄지로 누르기 쉬운 위치)과 검색창
    - [x] 목록 항목: 썸네일(없으면 자리표시 아이콘), Product No, Lot, 일시(`formatKstDisplay`), 탭하면 `/records/[id]`로 이동
    - [x] 목록 하단 **더 보기** 버튼 (더미 데이터 20건 단위로 잘라서 표시)
    - [x] `record-list`는 `items`, `total`, `status`(`loading`/`ready`/`error`), `query`, `onLoadMore`, `onRetry`를 props로 받는 표현 컴포넌트로 작성
  - 완료 조건 (PRD §5 홈 상태)
    - [x] S-홈-1 로딩 중: 목록 스켈레톤 표시
    - [x] S-홈-2 기록 없음: "아직 기록이 없습니다" + **스캔 시작** 버튼 강조
    - [x] S-홈-3 검색 결과 없음: "검색 결과가 없습니다"
    - [x] S-홈-4 조회 실패: 에러 배너 + **다시 시도** 버튼
    - [x] 정상 상태에서 20건 표시 후 더 보기로 나머지가 이어서 보인다 (F4-2의 화면 부분)
  - 화면 확인 (Playwright MCP): `?preview=loading|empty|no-result|error`로 4개 상태를 열어 스크린샷 기록

- **Task 006: 스캔 화면 단계형 UI 구현 (더미 데이터)** ✅ - 완료
  - See: `/tasks/006-scan-ui.md`
  - 의존: Task 004
  - 담당 파일
    - `src/app/scan/page.tsx`, `src/app/scan/_components/scan-flow.tsx`(`'use client'`, 단계 상태 `useReducer`)
    - 단계 화면: `src/app/scan/_components/scanner-step.tsx`, `confirm-step.tsx`, `photo-step.tsx`, `done-step.tsx`
    - 스캐너 영역: `src/components/scanner/scanner-view.tsx`(카메라 영상 자리 + 조준 가이드), `src/components/scanner/camera-unavailable.tsx`(권한 거부/미지원 안내)
    - 상세 화면과 공용: `src/components/records/record-fields.tsx`(Product No/Lot/메모 입력), `src/components/records/photo-slot.tsx`(촬영 버튼·미리보기·오류·비우기)
  - 구현 사항
    - [x] 단계 흐름: 스캐너 → 정보 확인·수정 → 사진 2장 촬영 → 저장 완료. 상단에 단계 표시(1/3, 2/3, 3/3), 스캔 단계에서는 하단 탭 바를 숨김 (Q10)
    - [x] 스캐너 단계: 전체 폭 카메라 영역(더미는 회색 영역 + 조준 사각형), "QR을 사각형 안에 맞춰주세요" 안내, 하단 **직접 입력** 버튼
    - [x] 정보 확인 단계: 원문(`raw_text`) 읽기 전용 박스, Product No/Lot/메모 입력(`record-fields`, React Hook Form + Task 003 스키마로 필드 오류 표시), 직접 입력 모드일 때 "QR 원문(선택)" 입력란 (Q7)
    - [x] 사진 단계: 바코드 사진·제품 사진 슬롯 2개(`photo-slot`: 빈 상태, 미리보기, 오류, 재촬영, 비우기), **저장** 버튼, 저장 중 스피너와 버튼 비활성화
    - [x] 완료 단계: 저장 결과 요약, **다음 스캔**·**홈으로** 버튼 (PRD §2-6)
    - [x] 토스트 문구 정의: "저장되었습니다", "중복 기록이 있습니다"(경고 스타일), 저장 실패 문구 (sonner)
    - [x] 모든 단계 컴포넌트는 값과 콜백을 props로 받아, Phase 4에서 실제 카메라·파서·API로 바꿔 끼울 수 있게 함
  - 완료 조건 (PRD §5 스캔 상태)
    - [x] S-스캔-1 카메라 권한 거부: 카메라 영역 대신 "카메라 권한이 필요합니다" 안내 + **직접 입력** 버튼 (F1-3 화면)
    - [x] S-스캔-2 카메라 미지원(비-HTTPS 포함): 스캐너 없이 직접 입력 화면이 바로 보임 (F1-4 화면)
    - [x] S-스캔-3 QR 분리 실패: 원문 표시 + "자동 인식 실패, 직접 입력해주세요" 안내 + 빈 Product No/Lot 입력 활성화 (F2-3 화면)
    - [x] S-스캔-4 사진 디코딩 실패: 해당 슬롯에 "지원하지 않는 이미지 형식입니다. 다시 촬영해주세요" 오류 (F3-3 화면)
    - [x] S-스캔-5 업로드(저장) 실패: 에러 토스트 + **다시 시도** 버튼, 입력값 유지
    - [x] S-스캔-6 중복: 저장 완료 후 성공 토스트와 "중복 기록이 있습니다" 경고 토스트가 함께 보임 (F4-1 화면, Q4)
    - [x] S-스캔-7 사진 미첨부 저장: "사진 없이 저장하시겠습니까?" 확인 모달 (F3-4 화면)
  - 화면 확인 (Playwright MCP): `?preview=denied|unsupported|parse-fail|photo-error|save-error|duplicate|no-photo`로 7개 상태를 열어 스크린샷 기록, 단계 간 이동은 더미 값으로 끝까지 진행

- **Task 007: 상세 화면 UI 구현 (더미 데이터)** ✅ - 완료
  - See: `/tasks/007-detail-ui.md`
  - 의존: Task 004, 006 (`record-fields`, `photo-slot` 재사용)
  - 담당 파일: `src/app/records/[id]/page.tsx`, `src/app/records/[id]/loading.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `src/app/records/[id]/_components/delete-record-button.tsx`, `src/app/records/[id]/_components/record-not-found.tsx`
  - 구현 사항
    - [x] 상단 헤더에 뒤로 가기, 등록·수정 일시 표시, 원문(`raw_text`) 읽기 전용 박스
    - [x] `record-fields`로 Product No/Lot/메모 수정, `photo-slot` 2개로 기존 사진 표시와 재촬영(교체) (Q5)
    - [x] 하단 고정 **저장** 버튼, 삭제 버튼(위험 스타일)
    - [x] 더미 데이터에서 id로 기록을 찾고, 없으면 `record-not-found` 표시
  - 완료 조건 (PRD §5 상세 상태)
    - [x] S-상세-1 로딩 중: 스켈레톤 (`loading.tsx`)
    - [x] S-상세-2 존재하지 않는 id: "기록을 찾을 수 없습니다" + 홈으로 이동 버튼
    - [x] S-상세-3 삭제 시도: 확인 모달
    - [x] S-상세-4 수정 저장 성공/실패: 성공 토스트 / 실패 토스트 + 입력값 유지
  - 화면 확인 (Playwright MCP): 더미 id·없는 id 진입, 삭제 모달 열기, `?preview=save-error` 상태 스크린샷 기록

- **Task 008: 내보내기 화면 UI 구현 (더미 데이터)** ✅ - 완료
  - See: `/tasks/008-export-ui.md`
  - 의존: Task 004
  - 담당 파일: `src/app/export/page.tsx`, `src/app/export/_components/export-form.tsx`(`'use client'`), `src/app/export/_components/export-status.tsx`
  - 구현 사항
    - [x] 시작일·종료일 `<input type="date">`, 빠른 선택 버튼(오늘, 최근 7일, 이번 달)
    - [x] **엑셀 다운로드** 버튼, 선택 기간 요약 문구
    - [x] 상태 표시 영역(`export-status`): 생성 중 스피너, 0건 안내, 상한 초과 오류, 200건 초과 확인 모달(`confirm-dialog`)
    - [x] 건수 확인·다운로드 동작은 `onCheckCount`, `onDownload` props로 분리 (Phase 5에서 API 연결)
  - 완료 조건 (PRD §5 내보내기 상태)
    - [x] S-내보내기-1 기간 미선택: 다운로드 버튼 비활성화 (F5-1 화면)
    - [x] S-내보내기-2 생성 중: 스피너 + "엑셀 생성 중... 사진이 많으면 시간이 걸릴 수 있습니다"
    - [x] S-내보내기-3 대상 0건: "선택한 기간에 기록이 없습니다" (F5-2 화면)
    - [x] S-내보내기-4 200건 초과(대량 내보내기 경고): "사진이 많아 생성에 시간이 걸릴 수 있습니다" 계속 진행 확인 모달 (F5-3 화면, Q3)
    - [x] S-내보내기-5 500건 초과: 다운로드 거부 + "기간을 좁혀주세요" 오류 (F5-4 화면)
    - [x] S-내보내기-6 생성 실패: 에러 토스트 + **다시 시도**
  - 화면 확인 (Playwright MCP): `?preview=generating|empty|warn|over-limit|error`와 날짜 미선택 상태 스크린샷 기록

- **Task 008-1: UX 검토 및 보완 사항 정리 (API 착수 전 PRD/ROADMAP 반영)** ✅ - 완료
  - See: `/tasks/008-1-ux-review.md`
  - 의존: Task 005, 006, 007, 008
  - 담당 파일: `tasks/008-1-ux-review.md`(검토 결과와 변경점 기록), `docs/PRD.md`, `docs/ROADMAP.md`(보완 사항 반영)
  - 구현 사항
    - [x] 더미 화면으로 핵심 흐름을 처음부터 끝까지 따라가며 점검: 홈 → 스캔 시작 → 정보 확인 → 사진 2장 → 저장 완료 → 다음 스캔 → 상세 수정·삭제 → 내보내기 (375x812, 390x844 뷰포트)
    - [x] 화면에서 발견한 부족한 점 정리: 빠진 입력 항목, 불필요한 단계, 문구, 버튼 위치·크기, 상태 표시 누락, 한 손 조작성
    - [x] 보완 사항을 API·데이터 쪽 변경점으로 정리: API 명세(요청·응답 필드, 쿼리, 에러 코드), 데이터 모델(PRD §6 `records` 컬럼), Zod 스키마·공통 타입(Task 003), 확인 필요 사항 Q1~Q10의 기본값 변경 여부
    - [x] 화면만 고치면 되는 항목은 Phase 2 Task(004~008) 안에서 바로 수정하고, API·데이터에 영향이 있는 항목은 Phase 3 Task(009~012) 명세에 반영
    - [x] 변경점을 `docs/PRD.md`와 `docs/ROADMAP.md`에 반영하고, 바뀐 Task 번호·영향 범위를 작업 파일에 기록. 사용자 확인이 필요한 항목은 "확인 필요 사항" 표에 추가
    - [x] Task 003의 타입·스키마·더미 데이터를 바뀐 명세에 맞게 갱신
  - 완료 조건
    - [x] 검토 결과(발견 사항, 결정, 반영 위치)가 `tasks/008-1-ux-review.md`에 정리되어 있다
    - [x] API·데이터에 영향이 있는 변경점이 모두 PRD/ROADMAP(Phase 3 Task 명세, 확인 필요 사항 표)에 반영되었다. 변경이 없으면 "변경 없음"으로 기록한다
    - [x] 갱신한 타입·스키마·더미 데이터로 `npm run typecheck`가 통과하고, Phase 2 화면이 그대로 동작한다
  - 화면 확인 (Playwright MCP): 위 핵심 흐름을 더미 데이터로 끝까지 진행하며 단계별 스크린샷 기록, 검토 전후 달라진 화면 비교

- **Task 008-2: 참고 자료 반영 화면·더미 데이터 보완** ✅ - 완료
  - See: `/tasks/008-2-reference-alignment.md`
  - 의존: Task 008-1
  - 담당 파일: `src/components/records/photo-slot.tsx`, `src/app/scan/_components/photo-step.tsx`, `src/app/scan/_components/scan-flow.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `src/app/records/[id]/_components/record-detail-skeleton.tsx`, `src/app/_components/record-list-item.tsx`, `src/app/_components/record-list.tsx`, `src/components/records/record-fields.tsx`, `src/components/scanner/scanner-view.tsx`, `src/lib/mock/records.ts`, `public/mock/barcode-sample.jpg`, `public/mock/product-sample.jpg`, `tasks/008-2-reference-alignment.md`
  - 구현 사항
    - [x] 사진 슬롯별 촬영 안내 문구: 바코드 사진 "라벨과 검사 스티커가 보이게 가까이", 제품 사진 "제품 전체가 보이게 가로로" (스캔·상세 화면 모두, PRD F3). `PHOTO_SLOTS` 공용 상수로 중복 정의 통합
    - [x] 더미 데이터의 P/NO·Lot를 실제 형식으로 교체 (예: `84739-DC000(G2E)`, `2608200040`, `2608200041`). 원문은 라벨 텍스트 형식(`2608200040 84739DC000G2E HW 1.00`)을 그대로 두고 변환하지 않음 (Q1, Q15)
    - [x] 가로로 긴 샘플 이미지 반영 (`public/mock/barcode-sample.jpg` 800x267 3:1, `public/mock/product-sample.jpg` 800x160 5:1, `sips`만 사용). 미리보기 상자를 2:1·`object-contain`으로 바꿔 잘리지 않게 함
    - [x] `record-fields` placeholder를 실제 형식 예시로 변경 (Product No `예: 84739-DC000(G2E)`, Lot `예: 2608200040`)
    - [x] 스캐너 안내 문구를 "코드를 사각형 안에 맞춰주세요"로 변경 (Q14), 홈 빈 상태 문구도 "코드"로 통일
  - 완료 조건
    - [x] `npm run check-all`, `npm run build` 통과
    - [x] 스캔 사진 단계·상세 화면에서 슬롯별 안내 문구가 보이고, 목록·상세에 실제 형식 더미 값이 표시된다
  - 화면 확인 (Playwright MCP): 375x812 뷰포트(프로덕션 빌드)에서 홈 목록, 스캐너 단계, 정보 확인 단계, 사진 단계, 상세 화면 스크린샷 기록. 가로로 긴 사진 미리보기가 `object-contain`으로 잘리지 않음을 `browser_evaluate`로 확인, 라이트·다크 테마 각 1회 확인, `scrollWidth` ≤ 375 확인

**Phase 2 완료 조건**

- [x] `npm run check-all` 통과 (Task 008-2 반영 후 다시 확인)
- [x] `npm run build` 통과 (`?preview` 쿼리가 프로덕션 빌드에서 무시되는지 포함, Task 008-2 반영 후 다시 확인)
- [x] "화면 상태 추적표"의 S-코드 전 항목을 더미 데이터로 화면에서 확인
- [x] Phase 2 화면 코드에 API 호출(`fetch`, `records-client`)이 없다
- [x] Task 008-1의 보완 사항이 PRD/ROADMAP에 반영되었다 (Phase 3 시작 조건)
- [x] Task 008-2의 화면 문구·더미 데이터 보완이 끝났다 (Phase 3 시작 조건)

### Phase 3: 데이터 계층 및 API 구축 (Task 008-1·008-2 반영 후 시작)

화면 없이도 API만으로 기록을 만들고 조회·수정·삭제·내보내기할 수 있는 상태를 만듭니다. Phase 2의 화면 코드에는 의존하지 않지만, Task 008-1에서 정리한 보완 사항(API 명세·데이터 모델·Zod 스키마·Q1~Q10 변경점)이 PRD/ROADMAP에 반영되고 Task 008-2(참고 자료 반영, Q14~Q16)가 끝난 뒤 시작합니다. 아래 Task의 명세는 현재 PRD 기준입니다.

- **Task 009: SQLite 초기화 모듈 및 기록 리포지토리 구현** ✅ - 완료
  - See: `/tasks/009-db-repository.md`
  - 의존: Task 003, 008-1, 008-2
  - 담당 파일: `src/lib/db.ts`, `src/lib/records-repo.ts` (둘 다 첫 줄에 `import 'server-only'`), `scripts/check-repo.ts`
  - 구현 사항
    - [x] `getDb()`: 처음 호출할 때 `DATA_DIR`와 `uploads/`를 `mkdirSync({ recursive: true })`로 만들고 `data/app.db`를 연다. import 시점에 DB를 열지 않아 `next build`가 DB 파일을 만들지 않게 함
    - [x] 개발 모드 HMR에서 연결이 여러 개 생기지 않도록 `globalThis`에 싱글턴으로 보관
    - [x] `PRAGMA journal_mode = WAL` 설정
    - [x] PRD §6 스키마(`records` 테이블, `idx_records_created`, `idx_records_product_lot`)를 `CREATE ... IF NOT EXISTS`로 생성하고, 이후 컬럼 추가에 대비해 `PRAGMA user_version`으로 스키마 버전 관리
    - [x] 리포지토리 함수: `insertRecord`, `findRecordById`, `listRecords({ q, limit, offset, from, to })`(최신순 `created_at DESC, id DESC`, `total` 함께 반환), `updateRecord`, `deleteRecord`, `existsByProductLot`(Q9), `listRecordsForExport(from, to)`(스캔 순서 `created_at ASC, id ASC`, Q16), `countRecordsInRange(from, to)`
    - [x] 검색은 `product_no`/`lot` 부분 일치, 대소문자 무시(`LIKE ... ESCAPE '\'`, 입력의 `%`, `_`, `\` 이스케이프) (F4-3)
    - [x] `created_at`/`updated_at`은 항상 `nowKstIso()` 값을 명시적으로 넣고, SQLite `datetime('now','localtime')`은 쓰지 않음 (PRD §6, §8, Q2)
    - [x] 모든 쿼리는 prepared statement와 바인딩 파라미터 사용
  - 완료 조건
    - [x] 빈 `data/` 상태에서 첫 호출 시 DB 파일과 테이블·인덱스가 자동으로 생긴다
    - [x] `npm run build` 후 `data/app.db`가 생기지 않는다
    - [x] `listRecordsForExport`가 같은 시각 기록도 `id` 순으로 스캔 순서대로 반환한다 (Q16)
  - 테스트 체크리스트: `scripts/check-repo.ts`(스크래치 `DATA_DIR`) 49개 검증 모두 통과(생성·CRUD·검색 이스케이프·대소문자·중복 판정·동일 `created_at` 순서·KST 자정 경계·페이지네이션 일관성·`EXPLAIN QUERY PLAN` 5종). 화면 연결이 없어 Playwright 대상이 아니다
  - 확인 필요: Q2, Q9, Q16

- **Task 010: 사진 저장소 유틸 및 `GET /api/photos/[file]` 구현** ✅ - 완료
  - See: `/tasks/010-photo-storage.md`
  - 의존: Task 003, 008-1, 008-2
  - 담당 파일: `src/lib/storage.ts`(`server-only`), `src/app/api/photos/[file]/route.ts`, `scripts/check-storage.ts`
  - 구현 사항
    - [x] `savePhoto(file: File)`: 크기(5MB)·MIME(`image/jpeg`/`image/png`)·매직 바이트를 검사하고, `crypto.randomUUID()` + `.jpg` 파일명으로 `UPLOAD_DIR`에 저장한 뒤 파일명 반환 (Q8)
    - [x] `deletePhoto(name)`: 파일이 없으면(`ENOENT`) 예외 없이 경고 로그만 남김 (PRD §4 DELETE, §8)
    - [x] `resolvePhotoPath(name)`: 파일명 정규식 검사 → `path.join(UPLOAD_DIR, name)` → `path.resolve` 결과가 `UPLOAD_DIR` 하위인지 재확인 (PRD §8 경로 조작 방지)
    - [x] 크기·형식 오류는 `PhotoTooLargeError`, `UnsupportedMediaError` 전용 에러로 던져 API가 413/415로 바꿀 수 있게 함
    - [x] `GET /api/photos/[file]`: 정규식에 맞지 않으면 파일시스템 조회 없이 즉시 `400 INVALID_FILENAME`, 파일이 없으면 `404 NOT_FOUND`, 성공 시 `200` + `Content-Type`(기본 `image/jpeg`) + `Cache-Control: private, max-age=31536000, immutable`
  - 완료 조건
    - [x] `%2e%2e%2f...`(인코딩된 경로 조작), `abc.png`, 대문자 uuid 등은 모두 400이고 파일시스템을 조회하지 않는다. 리터럴 `../etc/passwd`는 아래 참고(주석)와 같이 Next.js가 라우팅 전에 URL을 정규화해 우리 라우트에 도달하지 않고 전역 404가 응답한다 — fs 접근은 없어 보안 문제 없음
    - [x] 존재하는 uuid.jpg는 이미지와 캐시 헤더를 반환한다
  - 테스트 체크리스트: `scripts/check-storage.ts`(스크래치 `DATA_DIR`) 15개 검증 통과 + curl로 잘못된 파일명 5종(400), 없는 파일(404), 정상 파일(200 + 헤더) 확인, Task 011-B에서 dev 서버로 재확인. 화면 미연결로 Playwright 대신 curl/스크립트로 검증
    <!-- 리터럴 ../etc/passwd 확인 결과: curl 등 대부분의 HTTP 클라이언트가 URL의 '..' 세그먼트를 라우팅 전에 정규화(RFC 3986)해 /api/photos/../etc/passwd를 /api/etc/passwd로 바꾼다. 이 경로는 [file] 동적 세그먼트와 매칭되지 않아 Next.js 앱 전역 not-found.tsx(HTML 404)가 응답하고, INVALID_FILENAME 코드는 나오지 않는다. 파일시스템에는 접근하지 않으므로 보안 문제는 없다. -->

- **Task 011: 기록 CRUD API 구현** ✅ - 완료 (011-A·011-B)
  - See: `/tasks/011-records-api.md`
  - 의존: Task 009, 010, 008-2
  - 담당 파일: `src/app/api/records/route.ts`(GET, POST), `src/app/api/records/[id]/route.ts`(GET, PATCH, DELETE), `src/lib/record-mapper.ts`(row → DTO), `src/lib/record-form.ts`(multipart 공통 헬퍼), `src/lib/api/records-client.ts`(클라이언트용 fetch 래퍼)
  - 구현 사항
    - [x] `POST /api/records`(multipart): `request.formData()` → Zod 검증 → 사진 저장 → DB INSERT. DB 실패 시 이미 저장한 사진 파일을 삭제(롤백)하고 `500 INTERNAL_ERROR`. INSERT 전에 `existsByProductLot`로 중복 여부를 확인하되 저장은 진행하고 `201` 응답에 `duplicate` 포함 (F4-1, Q4)
    - [x] 오류 매핑: 검증 실패 `400 VALIDATION_ERROR`(+`fields`), 5MB 초과 `413 PAYLOAD_TOO_LARGE`, 이미지 아님 `415 UNSUPPORTED_MEDIA_TYPE` (PRD §4)
    - [x] `GET /api/records`: `q`, `limit`(기본 20, 최대 100), `offset`, `from`/`to`(Q6) → `{ items, total }`
    - [x] `GET /api/records/[id]`: id 검증 실패 400, 없으면 `404 NOT_FOUND`
    - [x] `PATCH /api/records/[id]`(multipart, 부분 수정): 보낸 필드만 갱신하고 `updated_at` 갱신. 사진을 보내면 새 파일 저장 → DB 갱신 → 성공 후 기존 파일 삭제. DB 갱신 실패 시 새 파일만 지우고 기존 파일 보존 (F4-5, Q5)
    - [x] `PATCH`는 사진 삭제를 받지 않는다. 사진이 없는 기록에 사진을 보내면 새로 추가한다 (Q11)
    - [x] `DELETE /api/records/[id]`: DB row 삭제 후 사진 파일 2개 삭제, 파일이 없으면 로그만 남기고 `204` (F4-4)
    - [x] `records-client.ts`: `createRecord`, `listRecords`, `getRecord`, `updateRecord`, `deleteRecord`와, 에러 응답을 `ApiError`(status, code, fields)로 바꾸는 공통 처리
  - 완료 조건
    - [x] 같은 Product No+Lot으로 두 번 저장하면 두 번째 응답이 `201`이고 `duplicate: true`다 (F4-1)
    - [x] 기록을 삭제하면 DB row와 `data/uploads/`의 사진 파일이 모두 사라진다 (F4-4)
    - [x] 사진을 교체하면 새 uuid 파일명이 DB에 들어가고 기존 파일은 삭제된다 (F4-5)
    - [x] `PATCH` 스키마에 `raw_text`가 없어, 값을 수정해도 원문은 바뀌지 않는다 (F1-5)
  - 테스트 체크리스트 (Playwright MCP `browser_evaluate`에서 `fetch` + `FormData`로 호출, curl 병행): 스크래치 `DATA_DIR`·dev 서버(포트 3103)에서 Task 011·010 체크리스트 24개 항목 전부 통과 — 상세 표는 `tasks/011-records-api.md` 참고
    - [x] 필수값 누락, `product_no` 101자, 공백만 있는 `lot` → 400과 `fields` 확인
    - [x] 6MB 파일 → 413, 텍스트 파일 → 415, 이때 `data/uploads/`에 파일이 남지 않음
    - [x] 사진 0장/1장/2장 생성 → 201, `created_at`이 `+09:00` 형식
    - [x] 중복 생성 → `duplicate: true`
    - [x] 목록 `limit=20`, `offset`, `q` 대소문자 무시 부분 일치, `limit=101` → 400
    - [x] 없는 id의 GET/PATCH/DELETE → 404, `id=0`/`id=abc` → 400
    - [x] PATCH로 사진 교체 후 이전 파일명으로 `GET /api/photos` → 404

- **Task 012: Excel 내보내기 API 구현** ✅ - 완료 (012-A·012-B)
  - See: `/tasks/012-excel-export.md`
  - 의존: Task 009, 010, 008-2
  - 담당 파일: `src/app/api/export/route.ts`, `src/lib/excel-export.ts`(`server-only`), `src/lib/jpeg-size.ts`(순수 함수, `server-only` 아님), `scripts/check-jpeg-size.ts`, `scripts/check-excel-export.ts`, `scripts/check-export.ts`, `scripts/seed-export-test.ts`
  - 구현 사항
    - [x] `GET /api/export?from=&to=`: Zod 검증 실패 또는 `from > to`면 `400 VALIDATION_ERROR`, 건수가 500건 초과면 `422 TOO_MANY_RECORDS`("기간을 좁혀주세요" 포함), 생성 실패면 `500 INTERNAL_ERROR` (PRD §4, F5-4, Q3)
    - [x] 기간 조회는 KST 기준: `created_at >= '{from}T00:00:00+09:00' AND created_at < '{to 다음 날}T00:00:00+09:00'` (모든 값이 같은 형식·오프셋이라 문자열 비교가 성립, Q2)
    - [x] `excel-export.ts`: `exceljs`로 8개 컬럼 No, 일시, Product No, Lot, QR 원문, 메모, 바코드 사진, 제품 사진 구성 (컬럼 추가 없음). 사진이 없거나 파일이 사라진 기록은 빈 셀 (F5-5)
    - [x] No는 파일 안 순번(1부터, DB id 아님), 행 순서는 `listRecordsForExport`의 `created_at ASC, id ASC` (F5-6, Q16)
    - [x] `jpeg-size.ts`: `readJpegSize(buffer): { width, height } | null`. 의존성 없이 SOF0(`0xFFC0`)/SOF2(`0xFFC2`) 마커에서 height/width(빅엔디안)를 읽음. `0xC4`(DHT)/`0xC8`/`0xCC`(DAC)는 SOF로 보지 않고, SOI/RST 등 길이 없는 마커는 건너뜀. JPEG가 아니거나 못 찾으면 `null` → 기본 상자 크기로 대체
    - [x] 비율 유지(contain): 고정 상자(가로 최대 240px·세로 최대 90px)에 대해 `scale = min(240 / w, 90 / h)`로 `ext`를 계산하고 `workbook.addImage({ buffer, extension: 'jpeg' })` + `worksheet.addImage(id, { tl, ext, editAs: 'oneCell' })`로 배치 (exceljs는 비율을 자동 유지하지 않음, F5-7)
    - [x] 행·열 크기: `row.height`는 pt 단위(`px × 0.75`, 90px → 67.5pt 이상), 사진 열 `column.width`는 문자 단위(`≈ (px − 5) / 7` + 여유 2~3)
    - [x] 헤더 행 스타일: 굵게, 배경색, 테두리, 가운데 정렬 (F5-7)
    - [x] 코드 주석으로 전제 명시: 저장된 JPEG는 Task 015에서 EXIF 회전을 픽셀에 반영한 정방향이므로 SOF 크기를 그대로 신뢰함 (PRD §8)
    - [x] 응답 헤더: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="records_{from}_{to}.xlsx"`
  - 완료 조건
    - [x] 받은 xlsx를 열면 사진 컬럼에 썸네일이 셀 안에 있고, 사진 없는 기록은 빈 셀이다 (F5-5)
    - [x] No가 1부터 이어지고, 행이 스캔 순서대로 나열된다 (F5-6)
    - [x] 3:1, 5:1 사진이 원본 비율을 유지한 채 셀 상자 안에 들어가고, 헤더 행 스타일이 적용되어 있다 (F5-7) — 바코드(3:1) 오차 0.12%, 제품(5:1) 오차 0%
    - [x] 501건 기간 요청은 422로 거부된다 (F5-4, 화면 검사와 별개로 서버에서 강제)
  - 테스트 체크리스트 (스크래치 `DATA_DIR`·dev 서버(포트 3104)에서 curl + `scripts/check-export.ts`로 수행, 화면 미연결로 Playwright 대신 사용): 012-A(순수 로직)·012-B(`GET /api/export`) 전 항목 통과 — 상세 표는 `tasks/012-excel-export.md` 참고
    - [x] `from > to`, `2026-13-01`, 파라미터 누락 → 400
    - [x] API로 사진 없는 기록 501건 생성 후 요청 → 422와 "기간을 좁혀주세요" 메시지
    - [x] 정상 요청 → 파일명·헤더 확인, 받은 파일을 `exceljs`로 다시 읽어 행 수와 이미지 개수 확인
    - [x] 23:59 KST와 00:00 KST 경계 기록이 올바른 날짜에 포함되는지 확인
    - [x] 기록 4건을 순서대로 생성(예: Lot `2608200040` → `41` → `44` → `42`) 후 내보내기 → No가 1~4, 행 순서가 생성 순서와 같음 (DB id와 무관)
    - [x] 3:1, 5:1 샘플 JPEG를 넣은 기록 내보내기 → 받은 파일을 `exceljs`로 다시 읽어 각 이미지 `ext`의 가로/세로 비율이 원본과 같고(오차 1% 이내) 240x90 상자를 넘지 않음
    - [x] JPEG가 아닌(또는 SOF를 못 찾는) 파일은 기본 상자 크기로 들어가고 오류가 나지 않음
  - 확인 필요: Q2, Q3, Q16

**Phase 3 완료 조건**

- [x] `npm run check-all` 통과
- [x] `npm run build` 통과 (API 라우트 4개 모두 동적(ƒ)으로 표시, `data/` 미생성, 클라이언트 번들에 서버 전용 모듈 없음)
- [x] Task 010, 011, 012 테스트 체크리스트 전부 통과

### Phase 4: 스캔·촬영·저장 기능 연결

Phase 2에서 만든 스캔 화면에 실제 QR 파서, 카메라, 이미지 리사이즈, 저장 API를 연결합니다.

- **Task 013: QR 파서 모듈 구현 (교체 가능 구조 + 기본 규칙)** ✅ - 완료
  - See: `/tasks/013-qr-parser.md`
  - 의존: Task 003 (Phase 2·3과 병행 가능)
  - 담당 파일: `src/lib/qr-parser.ts`, `scripts/check-qr-parser.ts`(검증 스크립트)
  - 구현 사항
    - [x] 시그니처: `parseQr(rawText: string): { productNo: string | null; lot: string | null; matchedRule: string | null }` 순수 함수 (F2-1)
    - [x] 규칙 인터페이스 `QrRule { name: string; parse(raw): { productNo, lot } | null }`와 규칙 배열 `QR_RULES`. 앞에서부터 시도해 처음 성공한 규칙 채택. 배열 앞/뒤에 추가하는 것만으로 우선순위 변경 가능 (F2-2)
    - [x] 기본 규칙 1 `key-value`: 줄바꿈/구분자로 나눈 `키:값`, `키=값`. 키 별칭(`PRODUCT`, `PRODUCT_NO`, `P/N`, `PN`, `LOT`, `LOT_NO`)을 대소문자 무시로 매칭
    - [x] 기본 규칙 2 `gs1-ai`: `(01)GTIN(10)LOT` 괄호 형식과 FNC1(`\x1d`) 구분 형식. GTIN → Product No, AI 10 → Lot
    - [x] 기본 규칙 3 `delimited`: `|`, `;`, `,` 구분 위치 분리. 인덱스는 설정 객체(`DELIMITED_RULE_CONFIG = { productNoIndex, lotIndex }`)로 분리
    - [x] 두 값 중 하나라도 비면 그 규칙은 실패로 봄. 결과 값은 trim
    - [x] P/NO 표기 정규화 `normalizeProductNo(value: string): string`를 `QR_RULES`와 분리된 후처리 함수로 둠. 대문자로 바꾼 값이 `^(\d{5})([A-Z0-9]{5})([A-Z0-9]+)$`(하이픈·괄호 없음)에 맞으면 `$1-$2($3)`로 바꾸고(예: `84739DC000G2E` → `84739-DC000(G2E)`), 이미 표 형식이거나 맞지 않으면 원본을 그대로 반환. 예외를 던지지 않음 (F2-5, Q15)
    - [x] 참고 라벨의 사람이 읽는 텍스트(줄바꿈 구분 `Lot` / `P/NO` / `HW 버전`, 예: `2608200040` / `84739DC000G2E` / `HW 1.00`)는 추정 규칙 후보로만 메모. 실제 원문 확보 후 Task 021에서 확정 (Q1)
    - [x] `scripts/check-qr-parser.ts`: 샘플 문자열과 기대값 표를 돌려 결과 출력 (Node 24 타입 스트리핑으로 `node scripts/check-qr-parser.ts` 실행)
  - 완료 조건
    - [x] 3개 규칙의 대표 샘플과 모든 규칙이 실패하는 샘플(빈 문자열, 임의 URL)의 결과가 기대값과 같다
    - [x] `normalizeProductNo` 샘플 4종이 기대값과 같다: `84739DC000G2E` → `84739-DC000(G2E)`, `84739-DC000(G2E)` → 그대로, `84739dc000g2e` → `84739-DC000(G2E)`, `ABC-123` → 그대로 (F2-5)
    - [x] 파서가 브라우저·서버 어느 쪽 API에도 의존하지 않는다
  - 테스트 체크리스트: `scripts/check-qr-parser.ts` 16/16 통과, Playwright MCP로 `/scan` 직접 입력 원문란에 key-value·GS1 괄호형·delimited 샘플을 넣어 자동 입력 결과 확인 — 전 항목 통과, 상세 표는 `tasks/013-qr-parser.md` 참고
    - [x] 검증 스크립트 전 항목 통과
    - [x] Playwright MCP로 `/scan` 직접 입력의 원문 입력란에 규칙별 샘플을 넣어 자동 입력 결과 확인 (Task 016 연결 후)
  - 확인 필요: Q1 (실제 샘플 확보 후 Task 021에서 전용 규칙을 배열 맨 앞에 추가), Q15

- **Task 014: QR 스캐너 카메라 로직 구현 (권한·미지원 처리)** ✅ - 완료
  - See: `/tasks/014-qr-scanner.md`
  - 의존: Task 006
  - 담당 파일: `src/components/scanner/qr-scanner.tsx`(`'use client'`), `src/lib/camera-support.ts`, `src/lib/feedback.ts`, `src/app/scan/_components/scanner-step.tsx`(연결)
  - 구현 사항
    - [x] `camera-support.ts`: `window.isSecureContext && !!navigator.mediaDevices?.getUserMedia`로 지원 여부 판단. 미지원이면 카메라를 시도하지 않고 바로 직접 입력으로 전환 (F1-4)
    - [x] `@zxing/browser`의 `BrowserMultiFormatReader`로 `facingMode: 'environment'` 스트림 디코딩, `scanner-view`의 영상 자리에 연결. 힌트(`DecodeHintType.POSSIBLE_FORMATS`)는 QR_CODE, DATA_MATRIX + CODE_128, EAN_13, CODE_39. 참고 라벨의 2D 코드가 Data Matrix이므로 반드시 포함 (F1-1, Q14)
    - [x] 작은 Data Matrix 인식을 위해 `decodeFromVideoDevice` 대신 `decodeFromConstraints`로 `video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }`를 직접 지정. `DecodeHintType.TRY_HARDER`는 1D 리더 순서가 밀리는 부작용이 있어 Task 022 실기기 측정 후 적용 여부 결정 → TRY_HARDER는 Data Matrix에 영향이 없음을 확인(2026-10-01)
    - [x] (후속 수정, 2026-10-01) 실기기에서 실제 라벨 Data Matrix가 인식되지 않음. zxing-js 검출기가 프레임 정중앙에서만 코드를 찾는 것이 원인이었다. 디코더를 `zxing-wasm`(zxing-cpp)으로 교체하고 조준 사각형 주변만 잘라 120ms 간격으로 디코딩(4번에 1번은 전체 프레임). 지원 기기에서 연속 초점·줌 1.5 적용. wasm은 `scripts/copy-zxing-wasm.mjs`로 `public/wasm/`에 복사해 self-host하고, 불러오지 못하면 zxing-js로 폴백. 상세는 `tasks/014-qr-scanner.md` 후속 수정
    - [x] `<video playsInline muted autoPlay>`로 iOS Safari 인라인 재생 보장, 언마운트·단계 이동 시 `controls.stop()`으로 카메라 트랙 해제
    - [x] 권한 거부(`NotAllowedError`)와 카메라 없음(`NotFoundError`)은 `camera-unavailable` 화면으로 전환 (F1-3)
    - [x] 인식 시 `onDetected(rawText)`를 1회만 호출하고 디코딩 일시 정지. `feedback.ts`에서 `navigator.vibrate(100)`(가능 기기) 또는 Web Audio 효과음. 효과음은 "스캔 시작" 탭에서 AudioContext를 미리 활성화 (F1-2)
    - [x] 스캐너는 `next/dynamic`(`ssr: false`)으로 불러와 서버 렌더링 시 브라우저 API를 참조하지 않게 함
  - 완료 조건
    - [x] 권한 거부 시 안내와 직접 입력 버튼이 보인다 (F1-3, S-스캔-1) — 문구·버튼 UI는 확인, 실제 `NotAllowedError` 트리거 재현은 Task 022 실기기 확인으로 이월
    - [x] 비-HTTPS 접속 시 권한 요청 없이 직접 입력 화면이 바로 보인다 (F1-4, S-스캔-2)
    - [ ] 인식 후 1초 이내에 원문이 표시된다 (F1-2) — **Task 022 실기기 확인으로 이월** (테스트 환경에 카메라 장치가 없어 측정 불가)
  - 테스트 체크리스트 (Playwright MCP) — 상세 표는 `tasks/014-qr-scanner.md` 참고
    - [x] 카메라 권한을 주지 않은/장치가 없는 컨텍스트에서 `/scan` 진입 → 안내 문구·직접 입력 버튼 확인 (테스트 환경에는 카메라 장치 자체가 없어 실제로는 `not-found` 화면이 나왔고, `denied` 문구·버튼은 `?preview=denied`로 별도 확인함)
    - [x] `browser_evaluate`로 `navigator.mediaDevices`를 제거한 상태 → 즉시 직접 입력 전환 확인
    - [x] (선택) Chromium 가짜 카메라(`--use-fake-device-for-media-stream`, `--use-file-for-fake-video-capture=<QR·Data Matrix 영상.y4m>`)로 인식 → 원문 표시 확인 — **생략: Playwright MCP는 브라우저 실행 옵션을 지정할 수 없어 적용 불가. Task 022 실기기 확인으로 이월** → Task 020에서 `getUserMedia`를 캔버스에 그린 QR 스트림으로 바꿔 실제 인식 경로(원문 표시·자동 입력·파싱 실패)를 확인함. 실제 카메라 인식 속도는 Task 022
  - 확인 필요: Q7, Q14

- **Task 015: 사진 리사이즈 로직 구현 및 사진 슬롯 연결** ✅ - 완료
  - See: `/tasks/015-image-resize.md`
  - 의존: Task 006
  - 담당 파일: `src/lib/image-resize.ts`, `src/components/records/photo-slot.tsx`(연결)
  - 구현 사항
    - [x] `photo-slot`의 `<input type="file" accept="image/*" capture="environment">`에서 파일을 받으면 리사이즈 후 미리보기 표시 (PRD F3)
    - [x] `image-resize.ts`: `createImageBitmap`(실패 시 `HTMLImageElement` 대체) → `<canvas>`에 긴 변 1600px 이하로 그림 → `canvas.toBlob('image/jpeg', 0.8)`. 결과 `File`은 항상 `image/jpeg` (F3-2)
    - [x] EXIF 회전 정보를 픽셀에 반영: `createImageBitmap(file, { imageOrientation: 'from-image' })`로 디코딩해 항상 정방향 JPEG로 저장. Task 012가 JPEG SOF 헤더의 가로·세로로 Excel 사진 비율을 계산하므로 이 전제가 필요 (PRD §8, F5-7)
    - [x] 리사이즈 전후 크기·해상도를 개발 모드에서 `console.debug`로 출력 (F3-1)
    - [x] 디코딩 실패(일부 HEIC 등) 시 슬롯 오류 상태로 전환하고 슬롯 비움 (F3-3, PRD §8)
    - [x] 재촬영 시 이전 미리보기(`URL.revokeObjectURL`)와 파일을 교체해 슬롯당 1장 유지 (Q5)
  - 완료 조건
    - [x] 사진을 고르면 바로 미리보기가 보인다 (F3-1)
    - [x] 4000x3000 JPEG와 PNG 모두 결과가 `image/jpeg`이고 긴 변이 1600px 이하다 (F3-2)
    - [x] 디코딩할 수 없는 파일을 고르면 오류 문구가 보이고 슬롯이 비어 있다 (F3-3, S-스캔-4)
    - [x] 세로로 찍어 EXIF 회전 정보가 있는 사진도 결과 JPEG의 가로·세로가 화면에 보이는 방향과 같다 (Task 012 SOF 크기의 전제)
  - 테스트 체크리스트 (Playwright MCP) — 상세 표는 `tasks/015-image-resize.md` 참고
    - [x] `browser_file_upload`로 큰 JPEG·PNG 업로드 → 미리보기 표시, `browser_console_messages`로 리사이즈 결과(타입·크기) 확인 (4000x3000 JPEG/PNG 모두 1600x1200, `image/jpeg`)
    - [x] 손상 이미지(HEIC 대신 `.jpg` 확장자에 임의 바이트로 대체) 업로드 → 오류 문구, 슬롯 비어 있음
    - [x] 같은 슬롯에 두 번 업로드 → 미리보기 1장만 유지 (EXIF 회전 사진 포함, `readJpegSize`로 저장 파일 방향도 확인)

- **Task 016: `/scan` 저장 흐름 연결** ✅ - 완료
  - See: `/tasks/016-scan-save-flow.md`
  - 의존: Task 011, 013, 014, 015
  - 담당 파일: `src/app/scan/_components/scan-flow.tsx`, `src/app/scan/_components/confirm-step.tsx`, `src/app/scan/_components/photo-step.tsx`
  - 구현 사항
    - [x] 인식 결과를 `parseQr`에 넣어 Product No/Lot 자동 입력, 원문은 폼 값과 별도로 보관해 수정 불가 (F1-5, F2-4)
    - [x] 자동 입력하는 Product No에 `normalizeProductNo`를 적용해 표 형식(`84739-DC000(G2E)`)으로 채움. `raw_text`는 바꾸지 않고, 사용자는 계속 수정 가능 (F2-5, Q15)
    - [x] 파싱 실패 시 S-스캔-3 상태로 전환 (F2-3)
    - [x] 직접 입력 모드에서 원문이 비어 있으면 `[직접입력]` 저장 (Q7)
    - [x] 사진 누락 시 확인 모달 후 저장 (F3-4)
    - [x] `records-client.createRecord`로 multipart 전송, 저장 중 중복 제출 방지
    - [x] 성공 시 "저장되었습니다" 토스트, `duplicate: true`면 별도 경고 토스트 (F4-1, Q4)
    - [x] 실패 시 에러 토스트 + **다시 시도**, 입력값·사진 유지. 400이면 `fields`를 입력 필드 오류로 표시, 413/415는 해당 사진 슬롯 오류로 표시 (`record-form.ts`가 413/415 응답에 `fields: { barcode_photo | product_photo }`를 담도록 확장)
    - [x] **다음 스캔**은 상태를 초기화하고 카메라를 다시 시작
  - 완료 조건
    - [x] `/scan`에서 스캔(또는 직접 입력)부터 저장까지 페이지 이동 없이 끝나고, 저장된 기록이 `GET /api/records`에 나온다
    - [x] F1-5, F2-3, F2-4, F2-5, F3-4, F4-1과 S-스캔-3, S-스캔-5, S-스캔-6, S-스캔-7을 실제 API로 만족한다
  - 테스트 체크리스트 (Playwright MCP, 직접 입력 경로 기준) — 상세 표는 `tasks/016-scan-save-flow.md` 참고
    - [x] 직접 입력 → 값 입력 → 사진 2장 업로드 → 저장 → 성공 토스트, 완료 화면
    - [x] 사진 없이 저장 → 확인 모달 → 취소 시 요청 없음, 확인 시 저장
    - [x] 같은 Product No+Lot 두 번 저장 → 두 번째에 성공 토스트와 중복 경고 토스트
    - [x] `browser_evaluate`로 `fetch`를 가로채 500 응답 → 에러 토스트, 다시 시도, 입력값 유지
    - [x] 필수값을 비운 채 저장 → 필드 오류, 요청이 나가지 않음
    - [x] 다음 스캔 → 모든 입력과 사진 초기화
    - [x] 직접 입력 원문란에 `84739DC000G2E`가 들어간 샘플 → Product No가 `84739-DC000(G2E)`로 자동 입력, 저장된 `raw_text`는 원문 그대로
    - [x] (추가) 413/415 오류 시 해당 사진 슬롯에 오류 표시(가로챈 응답 + curl로 실제 API 확인), 400 오류 시 confirm 단계 필드 오류 표시
    - [x] (회귀 수정 확인) `?preview=save-error`·`?preview=duplicate`는 더미 사진이 보이면 모달 없이 바로 저장 시도, `?preview=no-photo`는 여전히 모달 표시
  - 확인 필요: Q1, Q4, Q7, Q15

**Phase 4 완료 조건**

- [x] `npm run check-all` 통과
- [x] `npm run build` 통과 (`data/` 미생성 확인)
- [x] Task 013~016 테스트 체크리스트 전부 통과 (실기기에서만 확인 가능한 항목—Task 014의 인식 1초 이내·가짜 카메라 인식—은 Task 022 실기기 확인으로 이월, 각 Task 문서에 사실대로 기록)

### Phase 5: 목록·상세·내보내기 기능 연결

Phase 2에서 만든 홈·상세·내보내기 화면의 더미 데이터를 실제 API로 바꿉니다. 세 Task는 서로 독립적입니다.

- **Task 017: 홈 화면 API 연결 (목록·검색·페이지네이션)** ✅ - 완료
  - See: `/tasks/017-home-api.md`
  - 의존: Task 005, 011
  - 담당 파일: `src/app/_components/home-view.tsx`, `src/hooks/use-records.ts`
  - 구현 사항
    - [x] `use-records`: `GET /api/records`로 최초 20건 조회, **더 보기** 시 `offset` 증가해 이어 붙임, 로딩·오류 상태 관리 (F4-2)
    - [x] 검색 300ms 디바운스(`usehooks-ts`), 검색어가 바뀌면 `offset` 0부터 다시 조회 (F4-3)
    - [x] 썸네일을 `/api/photos/{file}`로 교체 (`loading="lazy"`)
    - [x] 더미 데이터 import 제거
  - 완료 조건
    - [x] 25건이 있을 때 처음 20건, 더 보기 후 25건이 보이고 더 보기 버튼이 사라진다 (F4-2)
    - [x] 대소문자가 다른 검색어로도 Product No 또는 Lot 부분 일치 기록만 보인다 (F4-3)
    - [x] S-홈-1~4가 실제 API 상태로 나타난다
  - 테스트 체크리스트 (Playwright MCP) — 결과는 `tasks/020-integration-test.md` 1부 참고
    - [x] API로 25건 생성 후 목록 20건 → 더 보기 → 25건
    - [x] 검색 `abc`로 `ABC-123` 조회, 없는 검색어로 "검색 결과가 없습니다"
    - [x] DB가 빈 상태에서 "아직 기록이 없습니다"
    - [x] `fetch`를 가로채 500 응답 → 에러 배너 → 다시 시도로 복구

- **Task 018: 상세 화면 API 연결 (수정·재촬영·삭제)** ✅ - 완료
  - See: `/tasks/018-detail-api.md`
  - 의존: Task 007, 011, 015
  - 담당 파일: `src/app/records/[id]/page.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `src/app/records/[id]/_components/delete-record-button.tsx`
  - 구현 사항
    - [x] 서버 컴포넌트에서 `await params` 후 id를 검증하고 `findRecordById`로 조회. 없거나 형식이 틀리면 S-상세-2
    - [x] 바뀐 필드와 바뀐 사진만 `PATCH`에 담아 전송 (F4-5, Q5)
    - [x] Phase 2의 `DetailSaveInput`(`fields` + 재촬영한 슬롯만 담은 `photos`)을 그대로 `FormData`로 바꿔 전송. 사진 삭제는 없음 (Q11)
    - [x] 저장 성공 시 성공 토스트 후 `router.refresh()`, 실패 시 실패 토스트 + 입력값 유지 (S-상세-4)
    - [x] 삭제 확인 → `DELETE` → 홈 이동 + 토스트 (F4-4, S-상세-3)
  - 완료 조건
    - [x] F4-4, F4-5를 화면에서 만족한다
    - [x] 없는 id(`/records/99999`, `/records/abc`)에서 안내와 홈 이동 버튼이 보인다
  - 테스트 체크리스트 (Playwright MCP) — 결과는 `tasks/020-integration-test.md` 1부 참고
    - [x] Product No 수정 저장 → 성공 토스트, 새로고침 후 값 유지, 원문은 그대로
    - [x] 제품 사진 재촬영 저장 → 새 이미지 표시, 이전 사진 URL은 404
    - [x] 삭제 확인 → 홈 이동, 목록에서 사라짐, 사진 URL 404
    - [x] `PATCH` 500 응답 가로채기 → 실패 토스트, 입력값 유지

- **Task 019: 내보내기 화면 API 연결** ✅ - 완료
  - See: `/tasks/019-export-api.md`
  - 의존: Task 008, 011, 012
  - 담당 파일: `src/app/export/_components/export-form.tsx`, `src/lib/api/export-client.ts`
  - 구현 사항
    - [x] 다운로드를 누르면 먼저 `GET /api/records?from=&to=&limit=1`로 건수 확인 (Q6): 0건 → S-내보내기-3, 500건 초과 → S-내보내기-5, 200건 초과 → S-내보내기-4 확인 모달 (Q3)
    - [x] `GET /api/export` 호출 중 S-내보내기-2, 응답을 `blob`으로 받아 `<a download>`로 저장. 422/500 응답은 JSON 에러 메시지로 S-내보내기-5/6 표시
    - [x] 서버의 422도 화면에서 같은 "기간을 좁혀주세요" 문구로 처리 (화면 검사를 건너뛴 경우 대비)
  - 완료 조건
    - [x] F5-1 ~ F5-5를 모두 만족한다
  - 테스트 체크리스트 (Playwright MCP) — 결과는 `tasks/020-integration-test.md` 1부 참고
    - [x] 날짜 미선택 시 버튼 비활성화
    - [x] 기록 없는 기간 → 안내 문구, `/api/export` 요청이 나가지 않음
    - [x] 201건 → 확인 모달, 취소 시 요청 없음, 확인 시 다운로드
    - [x] 501건 → 오류 문구, `/api/export` 요청이 나가지 않음
    - [x] 정상 다운로드 → 파일명 `records_{from}_{to}.xlsx` 확인
    - [x] `/api/export` 500 응답 가로채기 → 에러 토스트 + 다시 시도
  - 확인 필요: Q3, Q6

- **Task 020: 핵심 흐름 통합 E2E 테스트** ✅ - 완료
  - See: `/tasks/020-integration-test.md`
  - 의존: Task 016, 017, 018, 019
  - 담당 파일: `tasks/020-integration-test.md`(시나리오와 결과 기록), `tests/fixtures/`, `scripts/check-data-integrity.ts`(업로드 파일·DB 사진 파일명 정합성 검사)
  - 구현 사항
    - [x] 전체 흐름: 홈 → 스캔 시작(직접 입력) → 확인 → 사진 2장 → 저장 → 다음 스캔 → 2건째 저장 → 홈 목록 → 상세 수정 → 내보내기 다운로드
    - [x] 오류 흐름: 저장 실패 후 다시 시도 성공, 413/415 파일 업로드, 없는 기록 접근, 내보내기 422
    - [x] 경계 사례: `product_no` 100자/101자, 메모 500자, 검색어에 `%`·`_` 포함, 한글·특수문자 원문
    - [x] 데이터 정합성: 모든 시나리오 후 `data/uploads/`의 파일 목록과 DB의 사진 파일명이 정확히 일치 (고아 파일·고아 레코드 없음)
    - [x] 모바일 뷰포트(375x812, 390x844)에서 버튼 크기 48px 이상, 가로 스크롤 없음
  - 완료 조건
    - [x] 위 시나리오가 모두 통과하고 결과를 작업 파일에 기록했다
    - [x] 추적표에서 실기기 전용 항목(F1-1, F1-2)을 뺀 모든 F·S 항목이 실제 API로 확인되었다 (F1-2의 인식 경로는 `getUserMedia`를 캔버스 QR 스트림으로 바꿔 확인, 속도·진동·효과음은 Task 022)

**Phase 5 완료 조건**

- [x] `npm run check-all` 통과
- [x] `npm run build` 통과 (`data/` 미생성 확인)
- [x] Task 017~019 테스트 체크리스트와 Task 020 통합 테스트 통과

### Phase 6: 현장 적용

- **Task 021: 실제 QR 샘플 기반 파서 규칙 추가** - 1단계(측정 준비) 완료, 2단계 샘플 대기(확인 필요 Q1)
  - See: `/tasks/021-qr-real-samples.md`
  - 의존: Task 013, 실제 QR 샘플 확보
  - 담당 파일: `src/lib/qr-parser.ts`, `scripts/check-qr-parser.ts`, `tests/fixtures/qr-samples.example.json`(형식 예시), `tests/fixtures/qr-samples.json`(실제 샘플)
  - 구현 사항
    - [x] (1단계) 샘플 파일 형식 정의와 `check-qr-parser.ts --samples <경로>` 성공률 측정(95% 미만이면 exit 1, 실패 목록 출력)
    - [ ] 라벨 종류별 원문 샘플 수집 (최소 20개, 가능하면 거래처·라벨 종류별로 나눔). 참고 라벨(`84739-DC000(G2E)` 계열, Data Matrix) 원문을 반드시 포함
    - [ ] 샘플 형식에 맞는 전용 규칙을 만들어 `QR_RULES` 맨 앞에 추가 — 참고 라벨 1건(ISO 15434 `[)>`, `P`=Product No, `T`의 앞쪽 연속 숫자=Lot)으로 `iso15434` 규칙을 먼저 추가함(2026-10-01). 다른 라벨 샘플로 추가 검증 필요
    - [ ] 실제 샘플로 `normalizeProductNo` 규칙(5자리 숫자 + 5자리 영숫자 + 접미사)이 맞는지 검증하고, 다른 품번 체계가 있으면 규칙을 보완 (Q15)
    - [ ] 기본 규칙과 충돌하지 않는지 확인하고, 필요하면 순서 조정
    - [ ] 검증 스크립트에 실제 샘플과 기대값 추가
    - [ ] 1단계에서 발견한 두 가지를 실제 샘플로 결정: `P/NO` 키 별칭 추가 여부, 숫자만으로 된 품번(GTIN 등)을 `normalizeProductNo`에서 제외할지 (`tasks/021-qr-real-samples.md` 참고)
  - 완료 조건
    - [ ] 수집한 샘플의 자동 입력 성공률 95% 이상 (PRD §9)
    - [ ] 실패한 샘플은 원인과 함께 목록으로 정리해 사용자에게 공유했다
  - 테스트 체크리스트
    - [ ] 검증 스크립트 전 항목 통과
    - [ ] Playwright MCP로 직접 입력 원문란에 실제 샘플을 넣어 자동 입력 확인

- **Task 022: 휴대폰 실기기 테스트 (iOS Safari, Android Chrome)** - 결과표 양식·접속 절차 준비 완료, 실기기 측정 대기
  - 의존: Task 020 (배포 후 최종 확인은 Task 023과 함께)
  - 담당 파일: `docs/guides/device-test.md`(테스트 결과표)
  - 구현 사항
    - [x] 테스트 환경 준비: 개발 PC HTTPS 접속 절차와 루트 인증서 설치 방법을 `docs/guides/device-test.md` 2장에 정리. `npm run dev:https`는 `--hostname 0.0.0.0`이라 인증서에 LAN IP가 들어가지 않으므로, 휴대폰 테스트는 `--hostname <LAN IP>`로 실행 (Next.js는 `localhost`·`127.0.0.1`·`::1`·`--hostname` 값으로만 인증서를 만듦)
    - [ ] iOS Safari, Android Chrome 각각에서 F1-1(후면 카메라 자동 시작), F1-2(1초 이내 인식·진동/효과음), F1-3(권한 거부) 확인
    - [ ] 실제 라벨로 스캔 성공률과 1건 등록 소요 시간 측정 (목표 30초 이내, PRD §9)
    - [ ] 실제 Data Matrix 라벨(작은 코드, 옆에 검사 스티커가 붙은 상태)의 인식률·인식 시간 측정. zxing-wasm 스캐너의 줌(1.0·1.5·2.0)·디코딩 간격·ROI 여유 값을 비교해 Task 014 설정 확정 (Q14). 확정 후 zxing-js 폴백과 `@zxing/browser`·`@zxing/library` 제거 여부 결정
    - [ ] 사진 2장 저장 시간 측정 (목표 3초 이내, 사내 Wi-Fi, PRD §8)
    - [ ] 갤러리 HEIC 선택, 화면 회전, 앱 전환 후 복귀 시 카메라 해제·재시작 확인
    - [ ] 하단 탭 바·버튼의 한 손 조작성, iOS 안전 영역 겹침 여부 확인
    - [ ] 휴대폰에서 xlsx 다운로드·공유(iOS 파일 앱, Android 다운로드 폴더)와 Excel 앱에서 썸네일 표시 확인. 가로로 긴 사진이 찌그러지지 않고 순번·스캔 순서가 맞는지 확인 (F5-6, F5-7)
    - [ ] 200건 수준 내보내기 시간과 서버 메모리 사용량 측정 → 임계치 조정 필요 여부 판단 (Q3)
  - 완료 조건
    - [ ] 두 브라우저 모두 PRD §3 수용 기준과 §5 화면 상태 전 항목 통과 (결과표 기록)
    - [ ] 성능 목표(스캔 1초, 저장 3초, 등록 30초) 측정값 기록, 미달 항목은 개선 Task로 로드맵에 추가
  - 확인 필요: Q3, Q14

- **Task 023: 사내 서버 배포 및 운영 가이드 작성** - 설정·백업·가이드 준비 완료, 서버 적용 대기(PRD §10 서버 정보)
  - See: `/tasks/023-deployment.md`
  - 의존: Task 020
  - 담당 파일: `ecosystem.config.cjs`(PM2), `deploy/nginx.conf.example`, `docs/guides/deployment.md`, `scripts/backup-data.ts`(온라인 백업)
  - 구현 사항
    - [ ] 서버 준비: Node.js 24.16 설치, `better-sqlite3` 네이티브 모듈 설치 확인(prebuilt가 없으면 빌드 도구 필요), `npm ci && npm run build`
    - [x] PM2 설정: `NODE_ENV=production`, `TZ=Asia/Seoul`, `DATA_DIR`(절대 경로), `PORT`, 재시작 정책, 로그 경로. 서버 OS 타임존도 함께 확인 (PRD §8, Q2)
    - [x] nginx: HTTPS 인증서(사내 CA 또는 도메인 인증서, PRD §10 미결), `client_max_body_size`를 사진 2장 상한 이상(예: 12m)으로 설정(nginx 기본값 1MB), 내보내기용 `proxy_read_timeout` 연장(예: 120s), 사내망 IP만 허용
    - [x] 백업: `data/` 폴더 정기 백업. WAL 모드이므로 파일을 그냥 복사하지 말고 SQLite 온라인 백업(`sqlite3 app.db ".backup ..."` 또는 `better-sqlite3`의 `backup()`)으로 DB를 떠낸 뒤 `uploads/`와 함께 보관, 복원 절차 문서화
    - [x] 업데이트 절차(pull → `npm ci` → build → `pm2 reload`)와 장애 시 확인 항목(로그, 디스크 용량, 권한) 문서화
    - [ ] 서버에서 `/wasm/zxing_reader.wasm`이 `200`·`application/wasm`으로 응답하는지 확인 (스캐너 디코더, `docs/guides/deployment.md` 2장)
  - 완료 조건
    - [ ] 사내 서버 HTTPS 주소에서 휴대폰으로 전체 흐름(스캔 → 저장 → 목록 → 내보내기)이 동작한다
    - [ ] 서버 재시작 후에도 데이터가 유지되고, 저장된 기록 시각이 KST로 맞다 (로컬 `TZ=UTC` 프로덕션 리허설로는 확인, 서버 확인 대기)
    - [x] 백업본으로 다른 경로에 복원해 목록과 사진이 정상 표시된다 (로컬 프로덕션 리허설로 확인, 서버에서 한 번 더 확인)
    - [ ] 외부 인터넷에서 접근되지 않는다 (PRD §8 보안)
  - 확인 필요: Q2, PRD §10(서버 OS/Node 설치 가능 여부, 인증서 방식)

**Phase 6 완료 조건**

- [ ] `npm run check-all` 통과
- [ ] `npm run build` 통과 (사내 서버에서도 동일하게 확인)
- [ ] Task 022 결과표 작성, Task 023 배포 완료

### Phase 7: 현장 테스트 피드백 반영

실사용 테스트에서 나온 개선 요청 중 3건을 반영합니다. 현장은 PDA 하드웨어 스캐너를 쓰므로 PDA 입력을 기본으로 바꾸고 카메라(zxing-wasm) 인식은 대체 수단으로 남깁니다. 같은 원본 바코드는 다시 저장하지 못하게 막고, 기존 Product No+Lot 중복 경고는 없앱니다(Q19, Q20). 사진은 점등 사진을 더해 3장으로 늘립니다. 폐쇄망 CSS 미적용 건은 이번 범위에서 제외합니다(Q22).

- 이미 배포된 v1 마이그레이션은 수정하지 않습니다. 새 컬럼은 병합 순서대로 v2(`raw_key`), v3(`lighting_photo`)로 추가합니다.
- Task 024·025·026은 서로 독립적이지만 `scan-flow.tsx`를 함께 고치므로, 먼저 끝난 Task를 병합한 뒤 다음 Task를 그 위에서 마무리합니다.

- **Task 024: PDA 스캐너 입력을 기본으로 전환하고 카메라는 대체 수단으로 유지** - 우선순위
  - 의존: Task 014, 016
  - 담당 파일
    - 생성: `src/components/scanner/wedge-scan-input.tsx`(`'use client'`), `src/lib/wedge-input.ts`
    - 수정: `src/app/scan/_components/scanner-step.tsx`, `src/app/scan/_components/scan-flow.tsx`
  - 구현 사항
    - [ ] `wedge-scan-input.tsx`: 보이는 입력란을 자동 포커스. `inputMode="none"`(소프트 키보드 억제), `autoComplete`/`autoCorrect` off, `spellCheck={false}`. Enter가 오면 `onDetected(value)` 호출, 빈 값은 무시
    - [ ] 포커스를 잃으면 다시 포커스. 단, 다이얼로그가 열려 있으면 다시 포커스하지 않음
    - [ ] `wedge-input.ts`의 `normalizeWedgeText()`: PDA가 GS·RS·EOT를 대체 문자(예: `<GS>`)로 보낸 경우 원래 제어문자로 되돌려 `qr-parser.ts`의 `parseIso15434`를 그대로 쓸 수 있게 함 (Q18)
    - [ ] `scanner-step.tsx`: 기본 화면을 "PDA 스캔 대기"로 바꾸고, **카메라로 스캔** 버튼으로 기존 `QrScanner`를 띄움. 카메라 화면에서 **PDA 스캔으로 돌아가기** 제공. **직접 입력**은 그대로 유지
    - [ ] `scan-flow.tsx`: `isCameraSupported()` 확인을 카메라를 고른 시점으로 미룸(카메라 미지원이어도 PDA 입력 가능). PDA 입력도 기존 `DETECTED` dispatch를 그대로 타고, 진동·효과음 피드백(`feedback.ts`)을 같이 적용
    - [ ] 마지막으로 고른 방식(PDA/카메라)을 `localStorage`에 기억. 읽기·쓰기는 try/catch로 감쌈
  - 완료 조건
    - [ ] `/scan`에 들어가면 PDA 입력란이 포커스되어 있고, 원문 + Enter 입력으로 확인 단계로 넘어가며 Product No·Lot이 자동 입력된다 (F1-6)
    - [ ] 카메라로 전환했다가 PDA 스캔으로 돌아올 수 있고, 카메라 미지원 환경에서도 PDA 입력은 동작한다 (F1-7)
  - 테스트 체크리스트 (Playwright MCP)
    - [ ] `/scan` 진입 직후 `browser_evaluate`로 `document.activeElement`가 PDA 입력란인지 확인
    - [ ] `browser_type`으로 ISO 15434 원문(실제 제어문자 버전과 `<GS>` 대체 문자 버전 각각) + Enter → 확인 단계에서 Product No `84739-DC000(G2E)`·Lot 자동 입력 확인
    - [ ] 빈 값 + Enter는 무시되고 단계가 바뀌지 않음
    - [ ] 입력란 밖을 클릭한 뒤 다시 포커스되는지, 이탈 확인 모달이 열려 있을 때는 포커스를 빼앗지 않는지 확인
    - [ ] **카메라로 스캔** → 카메라 화면 → **PDA 스캔으로 돌아가기**, 새로고침 후 마지막 방식이 유지되는지 확인. `localStorage` 접근이 예외를 던지도록 바꿔도 화면이 정상인지 확인
    - [ ] `navigator.mediaDevices`를 없앤 환경에서 PDA 입력은 동작하고, 카메라를 고르면 미지원 안내가 보이는지 확인
  - 확인 필요: Q17, Q18

- **Task 025: 원본 바코드(`raw_text`) 중복 등록 차단**
  - 의존: Task 009, 011, 016
  - 담당 파일
    - 생성: `src/lib/raw-key.ts`, `src/app/api/records/duplicate/route.ts`, `src/components/dialogs/duplicate-raw-dialog.tsx`, `scripts/check-duplicate-raw.ts`
    - 수정: `src/lib/db.ts`, `src/lib/records-repo.ts`, `src/app/api/records/route.ts`, `src/lib/types/api.ts`, `src/lib/types/record.ts`, `src/lib/record-mapper.ts`, `src/lib/api/records-client.ts`, `src/app/scan/_components/scan-flow.tsx`
  - 구현 사항
    - [ ] `raw-key.ts`의 `toRawKey(raw)`: 제어문자를 지우고 trim. `MANUAL_RAW_TEXT`(`'[직접입력]'`)이면 `null` 반환 (Q19)
    - [ ] `db.ts` `MIGRATIONS` v2: `ALTER TABLE records ADD COLUMN raw_key TEXT` 후 기존 행을 `toRawKey`로 백필. 중복이 없으면 `CREATE UNIQUE INDEX idx_records_raw_key ON records(raw_key) WHERE raw_key IS NOT NULL`, 중복이 있으면 일반 인덱스 + `console.warn` (Q21)
    - [ ] `records-repo.ts`: `insertRecord`에 `raw_key` 추가, `findByRawKey(key)` 추가, `existsByProductLot` 제거 (Q20)
    - [ ] `POST /api/records`: 검증 직후·**사진 저장 전에** `findByRawKey`로 조회해 있으면 `409 DUPLICATE_RAW_TEXT` + `existing: { id, product_no, lot, created_at }`. 동시 요청 경합은 INSERT의 `SQLITE_CONSTRAINT_UNIQUE`를 같은 409로 바꾸고 `rollbackSavedPhotos`로 사진 롤백. 응답의 `duplicate` 플래그 제거
    - [ ] `GET /api/records/duplicate?raw_text=`: `{ duplicate, existing? }` 반환. 타입은 `ApiErrorCode`에 `DUPLICATE_RAW_TEXT` 추가, `CreateRecordResponse`에서 `duplicate` 제거, DTO에는 `raw_key`를 노출하지 않음
    - [ ] 클라이언트: `records-client.ts`에 `checkDuplicateRaw()` 추가. `scan-flow.tsx`에서 인식 직후(PDA·카메라)와 직접 입력 원문 blur 때 확인하고, 중복이면 `duplicate-raw-dialog.tsx`(AlertDialog: "이미 등록된 바코드입니다" + 기존 기록 요약, [기존 기록 보기]·[다시 스캔])를 띄우고 다음 단계로 가지 않음. 저장 시 409도 같은 다이얼로그. 확인 API가 네트워크 오류면 진행을 허용(최종 차단은 서버 409). 기존 P/L 중복 경고 토스트 제거
    - [ ] `scripts/check-duplicate-raw.ts`: 운영 DB에 이미 있는 중복 묶음을 출력
  - 완료 조건
    - [ ] 같은 원본 바코드를 다시 스캔하면 경고 다이얼로그가 뜨고 저장이 막힌다 (F4-6)
    - [ ] 같은 원문으로 `POST`하면 `409 DUPLICATE_RAW_TEXT`가 오고 `data/uploads/` 파일 수가 변하지 않는다
    - [ ] `[직접입력]` 원문은 여러 건 저장된다
    - [ ] 중복이 있는 v1 DB로 기동해도 앱이 정상 기동되고 경고 로그가 남는다
  - 테스트 체크리스트 (Playwright MCP)
    - [ ] 원문 A 저장 후 PDA 입력으로 A를 다시 넣으면 중복 다이얼로그가 뜨고 확인 단계로 넘어가지 않음. [기존 기록 보기]는 `/records/{id}`로, [다시 스캔]은 PDA 대기 화면으로 이동
    - [ ] 제어문자가 있는 원문과 제어문자를 뺀 같은 원문이 같은 중복으로 판정됨
    - [ ] `browser_evaluate`로 사진을 붙여 같은 원문 `POST` → 409, `existing` 필드 확인, 업로드 파일 수 불변
    - [ ] `fetch`를 가로채 중복 확인 API를 네트워크 오류로 만들면 다음 단계로 진행되고, 저장 시 409를 받으면 같은 다이얼로그가 뜸
    - [ ] 같은 원문 `POST` 2개를 동시에 보내면 1건만 201이고 나머지는 409, 고아 사진 파일 없음
    - [ ] 직접 입력 원문을 비워 `[직접입력]`으로 2건 저장 → 둘 다 201
    - [ ] Product No+Lot이 같고 원문이 다른 기록은 경고 없이 저장됨 (P/L 경고 폐지 확인)
  - 확인 필요: Q19, Q20, Q21

- **Task 026: 점등 사진 추가로 사진 3장·엑셀 9컬럼 지원**
  - 의존: Task 010, 011, 012, 015, 018
  - 담당 파일
    - 데이터·API: `src/lib/db.ts`, `src/lib/types/record.ts`, `src/lib/record-mapper.ts`, `src/lib/records-repo.ts`, `src/lib/record-form.ts`, `src/lib/api/records-client.ts`, `src/app/api/records/route.ts`, `src/app/api/records/[id]/route.ts`, `src/lib/excel-export.ts`
    - 화면: `src/components/records/photo-slot.tsx`, `src/app/scan/_components/scan-flow.tsx`, `photo-step.tsx`, `done-step.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `record-detail-skeleton.tsx`, `src/app/_components/home-view.tsx`
    - 더미·스크립트·배포: `src/lib/mock/records.ts`, `public/mock/lighting-sample.jpg`, `scripts/backup-data.ts`, `scripts/check-data-integrity.ts`, `scripts/check-excel-export.ts`, `scripts/check-repo.ts`, `scripts/seed-export-test.ts`, `deploy/nginx.conf.example`, `docs/guides/deployment.md`
  - 구현 사항
    - [ ] `db.ts` `MIGRATIONS` v3: `ALTER TABLE records ADD COLUMN lighting_photo TEXT`
    - [ ] 기존 사진 필드와 같은 패턴으로 `lighting_photo` 추가: 타입, 매퍼, `InsertRecordInput`·`UpdateRecordPatch`·`UPDATABLE_COLUMNS`·INSERT SQL, `PHOTO_FIELD_KEYS`, `records-client.ts`, 더미 데이터
    - [ ] `PHOTO_SLOTS`에 `lighting`("점등 사진", 안내 "램프가 켜진 상태가 보이게") 추가. `scan-flow.tsx`에 세 번째 `usePhotoCapture`, 사진 누락 확인·리셋·413/415 슬롯 매핑 반영. 상세·스켈레톤·완료 단계(장수 표시) 갱신, 홈 썸네일 순서는 바코드 → 제품 → 점등
    - [ ] `PATCH`의 사진 교체와 `DELETE`의 파일 삭제를 3장 모두에 적용
    - [ ] `excel-export.ts`: `COLUMNS` 9번째에 `점등 사진` 추가(주석 "8개 고정" 수정), `LIGHTING_PHOTO_COLUMN = 9`로 기존 `placePhoto` 재사용
    - [ ] 검증·백업 스크립트 5종을 3장 기준으로 갱신
    - [ ] `client_max_body_size`를 12m → 20m로 올림(5MB × 3 + 여유)
  - 완료 조건
    - [ ] 사진 3장을 저장하면 상세에 3장이 보이고, 점등 사진만 재촬영하면 그 파일만 교체된다 (F3-5)
    - [ ] 내보낸 엑셀의 컬럼이 9개이고, 9번째 `점등 사진`에 썸네일이 들어간다 (F5-5)
    - [ ] 기록 삭제 시 점등 사진 파일도 함께 삭제된다 (F4-4)
  - 테스트 체크리스트 (Playwright MCP)
    - [ ] `browser_file_upload`로 3개 슬롯에 정상 JPEG 업로드 → 저장 → 상세에서 3장 표시, 완료 단계 장수 표시 확인
    - [ ] 점등 사진만 비운 채 저장하면 사진 누락 확인 모달이 바코드·제품 사진과 같은 기준으로 동작
    - [ ] 점등 슬롯에 5MB 초과·이미지 아닌 파일 → 413/415 오류가 점등 슬롯에 표시
    - [ ] 상세에서 점등 사진만 재촬영 → 새 이미지 표시, 이전 URL 404, 다른 두 장은 그대로
    - [ ] 삭제 후 3장 URL 모두 404, `check-data-integrity.ts` 통과
    - [ ] 엑셀 다운로드 후 `check-excel-export.ts`로 9컬럼·점등 이미지 위치 확인
  - 확인 필요: Q5 (재촬영 교체 방식은 기존과 동일)

- **Task 027: Phase 7 통합 검증**
  - 의존: Task 024, 025, 026
  - 담당 파일: `tasks/027-phase7-verification.md`(시나리오와 결과 기록)
  - 구현 사항
    - [ ] `npm run check-all`, `npm run build` 실행
    - [ ] 기존 검증 스크립트 실행: `check-qr-parser.ts`, `check-repo.ts`, `check-excel-export.ts`, `check-data-integrity.ts`
    - [ ] v1 DB(중복 원문 포함)로 기동해 v2·v3 마이그레이션이 성공하고, 중복이 있으면 일반 인덱스 + 경고 로그로 기동되는지 확인 (Q21)
    - [ ] 결과를 작업 파일에 기록하고, 추적표의 Phase 7 항목(F1-6, F1-7, F3-5, F4-6, S-스캔-9, S-스캔-10)을 확인
  - 완료 조건
    - [ ] 아래 테스트 체크리스트가 모두 통과하고, 실기기에서만 확인할 수 있는 항목(PDA 제어문자 출력, Q17·Q18)은 현장 확인 대기로 기록했다
  - 테스트 체크리스트 (Playwright MCP, 스크래치 `DATA_DIR`)
    - [ ] 전체 흐름: `/scan` 진입(PDA 입력란 포커스) → ISO 15434 원문 + Enter → 확인 단계 자동 입력 → 사진 3장 → 저장 → 다음 스캔
    - [ ] 카메라로 전환 후 PDA로 복귀
    - [ ] 같은 원문 재입력 → 중복 다이얼로그, 진행 차단. fetch `POST` → 409, uploads 파일 수 불변
    - [ ] `[직접입력]` 2건 모두 저장
    - [ ] 상세에서 3장 표시, 점등 사진만 재촬영 교체
    - [ ] 엑셀 내보내기 → 9컬럼, 점등 이미지 삽입
    - [ ] 오류·경계: 저장 실패 후 다시 시도, 중복 확인 API 실패 시 진행 허용, 동시 저장 경합

**Phase 7 완료 조건**

- [ ] `npm run check-all` 통과
- [ ] `npm run build` 통과 (`data/` 미생성 확인)
- [ ] Task 024~026 테스트 체크리스트와 Task 027 통합 검증 통과

## PRD 수용 기준 추적표

| 코드 | 수용 기준 (PRD §3)                                                             | 화면(UI) Task | 기능 Task           | 검증 Task           |
| ---- | ------------------------------------------------------------------------------ | ------------- | ------------------- | ------------------- |
| F1-1 | HTTPS에서 `/scan` 진입 시 후면 카메라 자동 시작                                | 006           | 014                 | 022                 |
| F1-2 | 인식 1초 이내 진동/효과음 + 원문 표시                                          | 006           | 014                 | 020(인식 경로), 022 |
| F1-3 | 권한 거부 시 안내 + 직접 입력 버튼                                             | 006           | 014                 | 014, 020, 022       |
| F1-4 | 미지원/비-HTTPS 시 즉시 직접 입력 전환                                         | 006           | 014                 | 014, 020            |
| F1-5 | `raw_text` 원문 보존, 수정해도 불변                                            | 006, 007      | 011, 016            | 011, 020            |
| F1-6 | `/scan` 진입 시 PDA 입력란 자동 포커스, Enter로 원문 확정                      | 024           | 024                 | 024, 027            |
| F1-7 | 카메라 인식으로 전환 가능 (대체 수단)                                          | 024           | 024                 | 024, 027            |
| F2-1 | `parseQr` 순수 함수 시그니처                                                   | -             | 013                 | 013                 |
| F2-2 | 규칙 배열 등록, 추가만으로 우선순위 변경                                       | -             | 013                 | 013, 021            |
| F2-3 | 파싱 실패 시 안내 + 빈 입력 필드 활성화                                        | 006           | 016                 | 016, 020            |
| F2-4 | 자동 입력 값도 사용자 수정 가능                                                | 006           | 016                 | 016, 020            |
| F2-5 | 붙여 쓴 품번을 표 형식 P/NO로 자동 입력                                        | 008-2         | 013, 016            | 013, 016, 020, 021  |
| F3-1 | 선택 즉시 미리보기 + 리사이즈 용량 로그                                        | 006           | 015                 | 015                 |
| F3-2 | 결과물 `image/jpeg`, 긴 변 1600px 이하                                         | -             | 015                 | 015, 020            |
| F3-3 | 디코딩 실패 시 오류 표시 + 슬롯 비움                                           | 006           | 015                 | 015, 020, 022       |
| F3-4 | 사진 없이 저장 시 확인 모달                                                    | 006           | 016                 | 016, 020            |
| F3-5 | 점등 사진 1장 선택 촬영·저장·교체                                              | 026           | 026                 | 026, 027            |
| F4-1 | ~~중복 시 `duplicate: true` + 경고 토스트~~ (Phase 7에서 폐지, F4-6으로 대체)  | 006           | 011, 016, 025(제거) | 011, 016, 020       |
| F4-2 | 최근 20건 최신순 + 더 보기                                                     | 005           | 009, 017            | 017, 020            |
| F4-3 | Product No/Lot 부분 일치, 대소문자 무시 검색                                   | 005           | 009, 017            | 011, 017, 020       |
| F4-4 | 삭제 시 DB row와 사진 파일 모두 제거                                           | 007           | 010, 011, 018       | 011, 018, 020       |
| F4-5 | 재촬영 시 기존 파일 삭제, 새 파일명으로 DB 갱신                                | 007           | 010, 011, 018       | 011, 018, 020       |
| F4-6 | 같은 원본 바코드는 저장 차단 + 경고 다이얼로그                                 | 025           | 025                 | 025, 027            |
| F5-1 | 기간 미선택 시 다운로드 비활성화                                               | 008           | 019                 | 019, 020            |
| F5-2 | 0건이면 안내 문구                                                              | 008           | 019                 | 019, 020            |
| F5-3 | 200건 초과 시 확인 모달                                                        | 008           | 019                 | 019, 020, 022       |
| F5-4 | 500건 초과 시 거부 + "기간을 좁혀주세요"                                       | 008           | 012, 019            | 012, 019, 020       |
| F5-5 | 사진 썸네일이 셀에 삽입, 사진 없으면 빈 셀 (Phase 7부터 9컬럼, 점등 사진 포함) | -             | 012, 026            | 012, 020, 022, 027  |
| F5-6 | No 순번 + 스캔 순서(`created_at ASC`) 정렬                                     | -             | 009, 012            | 012, 020, 022       |
| F5-7 | 사진 원본 비율 유지 + 헤더 스타일                                              | -             | 012, 015            | 012, 022            |

> Task 020에서 실제 API로 확인한 결과는 `tasks/020-integration-test.md`의 "PRD 추적표 확인 결과"에 있습니다. F1-1과 F1-2의 속도·진동·효과음, Excel 앱에서의 표시(F5-5~F5-7)는 Task 022 실기기 테스트에서 확인합니다.

## 화면 상태 추적표 (PRD §5)

| 코드         | 화면     | 상태                                       | 처리                                                 | UI Task  | 연결 Task      |
| ------------ | -------- | ------------------------------------------ | ---------------------------------------------------- | -------- | -------------- |
| S-홈-1       | 홈       | 로딩 중                                    | 목록 스켈레톤                                        | 004, 005 | 017            |
| S-홈-2       | 홈       | 기록 없음                                  | "아직 기록이 없습니다" + 스캔 시작 강조              | 005      | 017            |
| S-홈-3       | 홈       | 검색 결과 없음                             | "검색 결과가 없습니다"                               | 005      | 017            |
| S-홈-4       | 홈       | 목록 조회 실패                             | 에러 배너 + 다시 시도                                | 004, 005 | 017            |
| S-스캔-1     | 스캔     | 카메라 권한 거부                           | 안내 + 직접 입력 버튼                                | 006      | 014            |
| S-스캔-2     | 스캔     | 카메라 미지원(비-HTTPS 포함)               | 즉시 직접 입력 화면                                  | 006      | 014            |
| S-스캔-3     | 스캔     | QR 인식/파싱 실패                          | 원문 표시 + 빈 입력 필드 활성화                      | 006      | 013, 016       |
| S-스캔-4     | 스캔     | 사진 디코딩 실패(HEIC 등)                  | 슬롯 오류 + 재촬영 유도                              | 006      | 015            |
| S-스캔-5     | 스캔     | 사진 업로드(저장) 실패                     | 에러 토스트 + 다시 시도, 입력값 유지                 | 006      | 016            |
| S-스캔-6     | 스캔     | ~~중복 Product No+Lot~~ (Phase 7에서 폐지) | ~~저장 후 중복 경고 토스트~~                         | 006      | 016, 025(제거) |
| S-스캔-7     | 스캔     | 사진 미첨부 저장 시도                      | 확인 모달                                            | 004, 006 | 016            |
| S-스캔-8     | 스캔     | 정보 확인·사진 단계에서 이탈               | 확인 모달 후 홈 이동                                 | 008-1    | -              |
| S-스캔-9     | 스캔     | PDA 스캔 대기 (기본 화면)                  | 입력란 자동 포커스 + 카메라로 스캔·직접 입력 버튼    | 024      | 024            |
| S-스캔-10    | 스캔     | 원본 바코드 중복                           | 경고 다이얼로그(기존 기록 보기·다시 스캔), 진행 차단 | 025      | 025            |
| S-상세-1     | 상세     | 로딩 중                                    | 스켈레톤                                             | 007      | 018            |
| S-상세-2     | 상세     | 존재하지 않는 id                           | "기록을 찾을 수 없습니다" + 홈 이동                  | 007      | 018            |
| S-상세-3     | 상세     | 삭제 시도                                  | 확인 모달, 사진 파일 포함 삭제                       | 004, 007 | 018            |
| S-상세-4     | 상세     | 수정 저장 성공/실패                        | 성공 토스트 / 실패 토스트 + 값 유지                  | 007      | 018            |
| S-내보내기-1 | 내보내기 | 기간 미선택                                | 다운로드 버튼 비활성화                               | 008      | 019            |
| S-내보내기-2 | 내보내기 | 생성 중                                    | 스피너 + 안내 문구                                   | 008      | 019            |
| S-내보내기-3 | 내보내기 | 대상 0건                                   | "선택한 기간에 기록이 없습니다"                      | 008      | 019            |
| S-내보내기-4 | 내보내기 | 경고 임계치(200건) 초과                    | 계속 진행 확인 모달                                  | 004, 008 | 019            |
| S-내보내기-5 | 내보내기 | 하드 상한(500건) 초과                      | 다운로드 거부 + "기간을 좁혀주세요"                  | 008      | 012, 019       |
| S-내보내기-6 | 내보내기 | 생성 실패                                  | 에러 토스트 + 다시 시도                              | 008      | 019            |

> S-상세-1(로딩)을 뺀 모든 화면 상태를 Task 020에서 실제 API로 확인했습니다. S-상세-1은 서버 컴포넌트가 조회를 마친 뒤 렌더링해 실제 경로에서는 보이지 않으므로 `?preview=loading`으로만 확인합니다.
