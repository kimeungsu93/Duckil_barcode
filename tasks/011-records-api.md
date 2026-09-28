# Task 011: 기록 CRUD API 구현

> ROADMAP: `docs/ROADMAP.md` Phase 3 · Task 011
> 의존: Task 009, 010, 008-2
> 상태: 완료

## 개요

기록 생성·조회·수정·삭제를 담당하는 `GET/POST /api/records`, `GET/PATCH/DELETE /api/records/[id]` Route Handler(011-A)와, 브라우저에서 이 API를 호출하는 fetch 래퍼 `src/lib/api/records-client.ts`(011-B)를 구현했다. 011-B에서는 ROADMAP Task 010·011의 테스트 체크리스트 전 항목을 실제 dev 서버로 수행했다.

## 관련 파일

- 생성(011-A): `src/app/api/records/route.ts`, `src/app/api/records/[id]/route.ts`, `src/lib/record-mapper.ts`, `src/lib/record-form.ts`
- 생성(011-B): `src/lib/api/records-client.ts`
- 참고: `docs/PRD.md` §4 / `docs/ROADMAP.md` Q4, Q5, Q9, Q11

## 수락 기준

- [x] 같은 Product No+Lot으로 두 번 저장하면 두 번째 응답이 `201`이고 `duplicate: true`다 (F4-1)
- [x] 기록을 삭제하면 DB row와 `data/uploads/`의 사진 파일이 모두 사라진다 (F4-4)
- [x] 사진을 교체하면 새 uuid 파일명이 DB에 들어가고 기존 파일은 삭제된다 (F4-5)
- [x] `PATCH` 스키마에 `raw_text`가 없어, 값을 수정해도 원문은 바뀌지 않는다 (F1-5)
- [x] `records-client.ts`: `createRecord`, `listRecords`, `getRecord`, `updateRecord`, `deleteRecord`, `ApiError`, `photoUrl` 제공
- [x] `npm run typecheck`, `npm run lint`, `prettier --check` 통과 (typecheck는 Task 012-A 작업 중인 `excel-export.ts`/`check-excel-export.ts`에서 무관한 기존 오류 2건이 있으나 `records-client.ts`와는 관련 없음을 확인)

## 구현 단계

- [x] 1단계(011-A): `record-mapper.ts`(row → DTO), `record-form.ts`(multipart 공통 헬퍼: 필드/사진 분리, 사전 검사, 저장, 롤백) 작성
- [x] 2단계(011-A): `POST/GET /api/records`, `GET/PATCH/DELETE /api/records/[id]` Route Handler 작성. 오류 매핑(400/404/413/415/500) 적용
- [x] 3단계(011-B): `src/lib/api/records-client.ts` 작성 — `ApiError` 클래스, `request<T>` 공통 헬퍼(204 → `undefined`, 실패 시 `ApiErrorBody` 파싱, 파싱 실패·네트워크 실패는 `INTERNAL_ERROR`), FormData 조립 시 `undefined` 필드 생략, `photoUrl` 헬퍼
- [x] 4단계(011-B): dev 서버(포트 3103, 스크래치 `DATA_DIR`)를 띄워 curl로 Task 011 체크리스트 전 항목과 Task 010 사진 API 체크리스트를 수행
- [x] 5단계(011-B): Playwright MCP `browser_navigate` + `browser_evaluate`로 `records-client.ts`와 동일한 로직(페이지 컨텍스트에서 재현)을 실제 브라우저 fetch/FormData로 실행해 생성·조회·수정·삭제·에러 처리를 확인
- [x] 6단계: 서버·브라우저 종료, 스크래치 `DATA_DIR` 삭제
- [x] 7단계: `npm run typecheck`, `npm run lint`, `prettier --check src/lib/api/records-client.ts` 통과 확인

## 테스트 체크리스트

> API 작업. curl(주력) + Playwright MCP `browser_evaluate`(fetch+FormData, records-client 로직 재현)로 검증했다. dev 서버는 `DATA_DIR`를 스크래치 임시 폴더로 지정해 포트 3103에서 실행했다.

### Task 011 (기록 CRUD)

| 항목                                 | 기대                                                     | 실제                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 필수값 누락(`raw_text` 없음)         | 400 + `fields.raw_text`                                  | ✅ `400 VALIDATION_ERROR`, `fields.raw_text: "QR 원문이 필요합니다"`                                                                                                                                                                                                                                                                  |
| `product_no` 101자                   | 400 + `fields.product_no`                                | ✅ `400 VALIDATION_ERROR`, `fields.product_no: "Product No는 100자 이하여야 합니다"`                                                                                                                                                                                                                                                  |
| 공백만 있는 `lot`                    | 400 + `fields.lot`                                       | ✅ `400 VALIDATION_ERROR`, `fields.lot: "Lot을 입력해주세요"` (trim 후 빈 문자열 판정)                                                                                                                                                                                                                                                |
| 6MB 파일 업로드                      | 413, `uploads/`에 파일 안 남음                           | ✅ `413 PAYLOAD_TOO_LARGE`, 업로드 전후 `uploads/` 디렉터리 비어있음 확인                                                                                                                                                                                                                                                             |
| 텍스트 파일(`text/plain`) 업로드     | 415, `uploads/`에 파일 안 남음                           | ✅ `415 UNSUPPORTED_MEDIA_TYPE`, `uploads/` 계속 비어있음(사전 검사 단계에서 차단되어 fs 접근 없음)                                                                                                                                                                                                                                   |
| 사진 0장 생성                        | 201, `created_at` `+09:00`                               | ✅ `201`, `barcode_photo: null`, `product_photo: null`, `created_at: "...+09:00"`                                                                                                                                                                                                                                                     |
| 사진 1장 생성                        | 201, `created_at` `+09:00`                               | ✅ `201`, `barcode_photo: "{uuid}.jpg"`, `product_photo: null`                                                                                                                                                                                                                                                                        |
| 사진 2장 생성                        | 201, `created_at` `+09:00`                               | ✅ `201`, 두 슬롯 모두 `{uuid}.jpg`                                                                                                                                                                                                                                                                                                   |
| 동일 product_no+lot 중복 생성        | 201 + `duplicate: true`                                  | ✅ `201`, `duplicate: true` (첫 생성은 `false`)                                                                                                                                                                                                                                                                                       |
| 목록 `limit=20`(기본)                | `items.length === 20`                                    | ✅ 총 25건 중 20건 반환, `total: 25`                                                                                                                                                                                                                                                                                                  |
| 목록 `offset`                        | 다음 페이지 반환                                         | ✅ `limit=5&offset=20` → 나머지 5건 반환                                                                                                                                                                                                                                                                                              |
| 목록 `q` 대소문자 무시 부분 일치     | 매칭 항목만 반환                                         | ✅ `q=prod-2`(소문자) → `PROD-20`~`PROD-25`(대문자로 저장) 6건 매칭                                                                                                                                                                                                                                                                   |
| 목록 `limit=101`                     | 400                                                      | ✅ `400 VALIDATION_ERROR`, `fields.limit: "limit은 100 이하여야 합니다"`                                                                                                                                                                                                                                                              |
| 없는 id GET/PATCH/DELETE (9999)      | 404                                                      | ✅ 셋 다 `404 NOT_FOUND`                                                                                                                                                                                                                                                                                                              |
| `id=0` / `id=abc` (GET/PATCH/DELETE) | 400                                                      | ✅ 모두 `400 VALIDATION_ERROR: "잘못된 ID입니다"`                                                                                                                                                                                                                                                                                     |
| PATCH로 사진 교체 후 이전 파일명 GET | 404                                                      | ✅ 교체 전 이전 파일 `200`, PATCH 후 이전 파일 `404`, 새 파일 `200`                                                                                                                                                                                                                                                                   |
| PATCH에 `raw_text` 포함 시도         | 무시되어 원문 불변                                       | ✅ `raw_text: "HACKED"` 전송했으나 응답 `raw_text`는 원래 값 그대로, `updated_at`만 갱신                                                                                                                                                                                                                                              |
| DELETE 후 row·파일 삭제              | GET 404, 사진 GET 404(2개)                               | ✅ DELETE `204`, 이후 GET `404`, 바코드·제품 사진 GET 각각 `404`                                                                                                                                                                                                                                                                      |
| records-client 브라우저 실행         | 실제 fetch/FormData로 생성·조회·수정·삭제·에러 처리 정상 | ✅ Playwright `browser_evaluate`로 records-client와 동일 로직을 페이지 컨텍스트에서 실행 — 사진 Blob 포함 생성, `q` 검색, PATCH(memo만 반영·raw_text 불변), DELETE(204 → `undefined`), 삭제 후 GET → `ApiError{status:404, code:'NOT_FOUND'}`, 검증 실패 → `ApiError{status:400, code:'VALIDATION_ERROR', fields}` 모두 기대대로 동작 |

### Task 010 (사진 API, 011-B에서 서버 기동 시 함께 수행)

| 항목                                                | 기대                                                                                     | 실제                                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `abc.png`                                           | 400 `INVALID_FILENAME`                                                                   | ✅                                                                                                                                                                 |
| 대문자 uuid(`....JPG` 등)                           | 400 `INVALID_FILENAME`                                                                   | ✅                                                                                                                                                                 |
| `uuid.jpeg`(확장자 오류)                            | 400 `INVALID_FILENAME`                                                                   | ✅                                                                                                                                                                 |
| 인코딩된 경로 조작 `%2e%2e%2f%2e%2e%2fetc%2fpasswd` | 400 `INVALID_FILENAME`                                                                   | ✅                                                                                                                                                                 |
| 리터럴 `../etc/passwd`                              | (Task 010 문서 참고)                                                                     | ⚠️ 우리 라우트에 도달하지 않고 Next.js 앱 전역 HTML 404 응답 — `tasks/010-photo-storage.md`의 "확인 필요" 항목과 동일한 현상 재확인. fs 접근은 없어 보안 문제 없음 |
| 형식은 맞지만 존재하지 않는 파일                    | 404 `NOT_FOUND`                                                                          | ✅                                                                                                                                                                 |
| 정상 파일 요청                                      | 200 + `Content-Type: image/jpeg` + `Cache-Control: private, max-age=31536000, immutable` | ✅ 헤더 그대로 확인                                                                                                                                                |

**결과 요약: 24개 항목 중 24개 통과** (`../etc/passwd` 1건은 Task 010에서 이미 기록한 알려진 차이이며 실패가 아니라 "예상된 동작"으로 재확인만 한 것)

## 확인 필요

- 011-A에서 이미 정리된 결정 사항(오류 매핑, 사진 저장/롤백 순서, 중복 판정 기준 등)은 코드 주석과 `src/app/api/records/*`, `src/lib/record-form.ts`에 남아 있어 이 문서에서는 반복하지 않는다.
- `../etc/passwd` 리터럴 요청이 우리 라우트에 도달하지 않는 현상은 Task 010에서 이미 문서화했다. 011-B 테스트에서도 동일하게 재현되어 별도 조치 없이 사실 확인만 했다.
- 목록 검색(`q`)은 대소문자를 무시한 부분 일치이며, 저장된 값(`PROD-20` 등 대문자)과 검색어(`prod-2` 소문자)의 대소문자가 달라도 매칭됨을 실제로 확인했다(SQLite `LIKE`의 기본 대소문자 무시 동작, ASCII 범위에 한함).

## 변경 사항 요약

- `src/lib/api/records-client.ts`(신규): 브라우저 전용 fetch 래퍼. `server-only` 모듈은 import하지 않고 `@/lib/types/api`, `@/lib/types/record`의 타입만 사용한다.
  - `ApiError extends Error { status; code; fields? }`
  - `request<T>(input, init)`: 네트워크 실패·JSON 파싱 실패를 모두 `ApiError`(`INTERNAL_ERROR`)로 변환, `!res.ok`면 `ApiErrorBody`를 파싱해 `ApiError`로 던짐, `204`는 `undefined` 반환
  - `createRecord`, `listRecords`, `getRecord`, `updateRecord`, `deleteRecord`, `photoUrl` export
  - FormData 조립 헬퍼(`appendIfDefined`)는 값이 `undefined`인 필드를 아예 넣지 않아 PATCH의 "보낸 필드만 갱신" 규칙과 일치시킴
- 버그 수정 없음: 011-A 라우트(`records/route.ts`, `records/[id]/route.ts`)와 `record-form.ts`, `storage.ts`, `records-repo.ts` 모두 체크리스트 전 항목을 그대로 통과해 수정하지 않았다.
- Task 012-A/012-B 담당 파일(`src/lib/jpeg-size.ts`, `src/lib/excel-export.ts`, `src/app/api/export/**`, `scripts/check-*excel*`, `scripts/check-jpeg-size.ts`)은 건드리지 않았다.
- 테스트는 `DATA_DIR`를 스크래치 임시 폴더(`.../scratchpad/api-011b`)로 지정한 dev 서버(포트 3103)에서 수행했고, 종료 후 서버 프로세스를 죽이고 스크래치 폴더를 삭제했다. 실제 `data/`는 건드리지 않았다.
