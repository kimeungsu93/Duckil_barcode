# Task 003: 공통 타입·Zod 스키마·상수·KST 유틸·더미 데이터 정의

> ROADMAP: `docs/ROADMAP.md` Phase 1 · Task 003
> 의존: Task 002
> 상태: 완료

## 개요

화면(Phase 2)과 API(Phase 3)가 함께 쓰는 타입·Zod 스키마·제한 수치·KST 시간 유틸·에러 헬퍼·더미 데이터를 정의한다. Task 008-1 UX 검토 결과에 따라 바뀔 수 있는 초안이다.

## 관련 파일

- 생성(003-A): `src/lib/constants.ts`, `src/lib/types/record.ts`, `src/lib/types/api.ts`, `src/lib/schemas/record.ts`, `src/lib/schemas/export.ts`, `src/lib/schemas/photo.ts`, `scripts/check-schemas.ts`, `scripts/register-alias.mjs`
- 생성(003-B): `src/lib/time.ts`, `src/lib/api-error.ts`, `src/lib/mock/records.ts`, `public/mock/`, `scripts/check-time.ts`
- 참고: `docs/PRD.md` §4(검증 표·API 명세), §6(데이터 모델), §8

## 수락 기준

- [x] 모든 타입·스키마가 `npm run typecheck`를 통과한다
- [x] 더미 데이터가 `npm run typecheck`를 통과한다
- [x] `nowKstIso()`가 `TZ=UTC`와 `TZ=Asia/Seoul` 두 환경에서 같은 결과를 낸다

## 구현 단계

### 003-A: 타입·스키마·상수

- [x] `constants.ts`: 사진(5MB, jpeg/png), 리사이즈(1600, 0.8), 입력 길이(2000/100/500), 목록(20/100), 내보내기(200/500, Q3), `MANUAL_RAW_TEXT`(Q7)
- [x] `types/record.ts`: `RecordRow`, `RecordDto`, `CreateRecordResponse`, `RecordListResponse`
- [x] `types/api.ts`: `ApiErrorCode`(7종), `ApiErrorBody`
- [x] `schemas/record.ts`: `createRecordSchema`, `updateRecordSchema`(raw_text 없음), `recordIdSchema`, `listQuerySchema`(from/to, Q6)
- [x] `schemas/export.ts`: `dateStringSchema`(형식 + 실제 날짜), `exportQuerySchema`(from <= to)
- [x] `schemas/photo.ts`: `photoFilenameSchema`, `checkPhotoFile()`

### 003-B: KST 유틸·에러 헬퍼·더미 데이터

- [x] `time.ts`: `nowKstIso`, `kstDayStart`, `kstNextDayStart`, `todayKstDate`, `formatKstDisplay`
- [x] `api-error.ts`: `apiError`, `zodErrorToFields`
- [x] `mock/records.ts` 27건 + `mockPhotoUrl()`, `findMockRecord()`, `public/mock/` 샘플 이미지 2장(800x600 JPEG)

## 테스트 체크리스트

- [x] `node --import ./scripts/register-alias.mjs scripts/check-schemas.ts` → 33개 경계값 검사 통과 (raw_text 0/2000/2001자, product_no 공백·100·101자, memo 500·501자, id 0·1.5·abc, limit 101, offset -1, from>to, 없는 날짜, 파일명 `../x.jpg`·대문자·`.png`, 6MB·gif·HEIC 파일 코드, trim)
- [x] `TZ=UTC`, `TZ=Asia/Seoul`, `TZ=America/Los_Angeles`에서 `scripts/check-time.ts` 결과 동일 (날짜 경계 UTC 15:30 → KST 다음 날 00:30, 연말 `2026-12-31` → `2027-01-01`, 윤년 `2028-02-28` → `2028-02-29`)
- [x] 더미 27건 모두 `createRecordSchema`·`photoFilenameSchema` 통과, 최신순 정렬, 중복 쌍 2개(2건·3건), 직접입력 2건, 사진 둘 다 13건·없음 5건

## 확인 필요

- 사진 크기·형식 검사는 413/415 에러 코드를 나눠야 해서 Zod 스키마가 아닌 순수 함수 `checkPhotoFile()`로 만들었다. 매직 바이트 검사는 Task 010에서 서버 저장 시 추가한다 (Q8).
- `memo`는 빈 문자열도 허용한다(폼에서 비워 보내는 경우). 저장 시 빈 문자열을 `null`로 바꿀지는 Task 011에서 정한다.
- 검증 스크립트는 `@/` 별칭 때문에 Node만으로 실행할 수 없어, 신규 의존성 없이 `scripts/register-alias.mjs`(Node `module.registerHooks`) resolve 훅을 추가했다.

## 변경 사항 요약

- 제한 수치를 `constants.ts` 한 곳에 모았다. 입력 길이(2000/100/500)도 스키마 메시지에서 재사용하도록 상수로 뺐다.
- `RecordDto`는 현재 `RecordRow`와 필드가 같지만 DB와 API 계약을 분리하려고 별도 타입으로 두었다.
- Zod v4의 `error` 파라미터로 한국어 메시지를 지정했다(Context7로 v4 API 확인). 날짜는 형식과 실제 존재 여부를 함께 검사한다.
- `time.ts`는 UTC에 9시간을 더한 뒤 `getUTC*`로 조합해 OS 타임존과 무관하다. `formatKstDisplay()`는 문자열을 잘라 써서 브라우저 타임존 영향도 없다.
- `api-error.ts`는 `next/server`를 쓰므로 Route Handler 전용이다.
- 더미 데이터는 Q9 확인용으로 대소문자만 다른 기록(중복 아님)도 넣었다. 사진 파일명은 uuid v4 형식 고정값이고 화면에서는 `mockPhotoUrl()`로 `public/mock/` 이미지에 연결한다.
- 샘플 이미지는 신규 의존성 없이 Python으로 BMP를 만들고 macOS `sips`로 JPEG 변환했다.
- 검증 스크립트 실행 시 Node가 `MODULE_TYPELESS_PACKAGE_JSON` 경고를 낸다(동작에는 문제 없음). 필요하면 `--no-warnings`를 붙인다.
