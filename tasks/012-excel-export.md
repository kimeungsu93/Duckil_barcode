# Task 012: Excel 내보내기 API 구현

> ROADMAP: `docs/ROADMAP.md` Phase 3 · Task 012
> 의존: Task 009, 010, 008-2
> 상태: 완료

## 개요

기간을 골라 사진 썸네일이 셀에 들어간 `.xlsx` 파일을 만드는 기능을 두 단계로 나눠 구현했다. 012-A는 순수 로직(JPEG 크기 판독, 워크북 생성)을, 012-B는 이를 감싸는 `GET /api/export` Route Handler와 ROADMAP 테스트 체크리스트 전 항목 수행을 담당한다.

## 관련 파일

- 생성(012-A): `src/lib/jpeg-size.ts`, `src/lib/excel-export.ts`, `scripts/check-jpeg-size.ts`, `scripts/check-excel-export.ts`
- 생성(012-B): `src/app/api/export/route.ts`, `scripts/check-export.ts`, `scripts/seed-export-test.ts`
- 참고: `docs/PRD.md` §4 `GET /api/export`, F5 / `docs/ROADMAP.md` Q2, Q3, Q16

## 수락 기준

- [x] 받은 xlsx를 열면 사진 컬럼에 썸네일이 셀 안에 있고, 사진 없는 기록은 빈 셀이다 (F5-5)
- [x] No가 1부터 이어지고, 행이 스캔 순서대로 나열된다 (F5-6)
- [x] 3:1, 5:1 사진이 원본 비율을 유지한 채 셀 상자 안에 들어가고, 헤더 행 스타일이 적용되어 있다 (F5-7)
- [x] 501건 기간 요청은 422로 거부된다 (F5-4)
- [x] `npm run typecheck`, `npm run lint` 통과

## 구현 단계

- [x] 1단계(012-A): `jpeg-size.ts` — JPEG SOF0/SOF2 마커에서 가로·세로를 읽는 의존성 없는 순수 함수. DHT(`0xC4`)·DAC(`0xC8`/`0xCC`)는 SOF로 취급하지 않음, 구조 손상 시 예외 없이 `null`
- [x] 2단계(012-A): `excel-export.ts` — `buildExportWorkbook(rows)`가 8개 컬럼(No·일시·Product No·Lot·QR 원문·메모·바코드 사진·제품 사진) 워크북을 만든다. 사진은 `readPhoto`로 읽어 `contain` 방식(`scale = min(240/w, 90/h)`)으로 비율을 유지한 채 240x90 상자에 배치. SOF를 못 읽거나 PNG면 기본 상자(240x90) 사용
- [x] 3단계(012-A): exceljs 번들 타입(구버전 `@types/node` 기준)이 최신 `@types/node` 제네릭 `Buffer`와 선언 병합되며 구조적 할당이 깨지는 지점 2곳(`workbook.addImage` 호출, `writeBuffer()` 반환값)에 좁은 범위 `any`/`unknown` 캐스트로 우회
- [x] 4단계(012-B): `src/app/api/export/route.ts` — `exportQuerySchema` 검증(400) → `countRecordsInRange`로 하드 상한(500) 확인(422, "기간을 좁혀주세요") → `listRecordsForExport` → `buildExportWorkbook` → `Content-Disposition`/`Content-Type` 헤더와 함께 `Response` 반환, 생성 실패 시 500. `new Response(buffer, ...)`도 같은 타입 충돌이 있어 같은 방식으로 좁은 범위 캐스트 적용
- [x] 5단계(012-B): `scripts/check-export.ts` — 받은 xlsx를 exceljs로 재읽기해 행 수·이미지 수·No 순번·헤더 스타일을 확인하고, 각 이미지는 임베드된 버퍼를 `readJpegSize`로 직접 재판독해 원본 비율과 비교(1% 이내)·240x90 이하 확인. PNG나 SOF 없는 JPEG는 기본 상자(240x90) 그대로인지만 확인
- [x] 6단계(012-B): `scripts/seed-export-test.ts` — DB에 `created_at`을 직접 지정해 삽입하는 스크립트(`many`/`boundary`/`lots` 서브커맨드). dev 서버와 같은 `DATA_DIR`를 가리켜 대량 생성·KST 경계·생성 순서 테스트에 사용
- [x] 7단계(012-B): 포트 3104, `DATA_DIR`를 스크래치 임시 폴더로 지정한 dev 서버를 띄워 ROADMAP 테스트 체크리스트 전 항목을 curl + `check-export.ts`로 수행
- [x] 8단계: 서버 종료, 스크래치 임시 파일 정리, `npm run typecheck`·`npm run lint`·`prettier --check`(신규 파일만) 통과 확인

## 테스트 체크리스트

> API 작업. curl(주력) + `scripts/check-export.ts`(exceljs 재읽기)로 검증했다. dev 서버는 `DATA_DIR`를 스크래치 임시 폴더로 지정해 포트 3104에서 실행했다. 실제 `data/` 디렉터리는 생성되지 않았다.

### 012-A (jpeg-size.ts / excel-export.ts, 순수 로직 검증)

| 항목                                                                  | 기대                                                              | 실제                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| `readJpegSize(barcode-sample.jpg)`                                    | `{width:800, height:267}`                                         | ✅                                |
| `readJpegSize(product-sample.jpg)`                                    | `{width:800, height:160}`                                         | ✅                                |
| PNG 버퍼·SOI만 있는 버퍼·절단된 JPEG·빈 버퍼·길이 필드 잘린 버퍼(5종) | 모두 `null`(예외 없음)                                            | ✅ 5종 모두 `null`                |
| `buildExportWorkbook`: 행 수(헤더+4)                                  | `rowCount === 5`                                                  | ✅                                |
| `buildExportWorkbook`: No 순번(1~4)                                   | 배열 순서대로                                                     | ✅ `[1,2,3,4]`                    |
| `buildExportWorkbook`: 헤더 스타일(8컬럼)                             | 굵게·배경·테두리·가운데정렬                                       | ✅                                |
| `buildExportWorkbook`: 이미지 개수                                    | 2(사진 있는 2건만)                                                | ✅                                |
| 바코드 사진(3:1, 800x267) 비율 오차                                   | 1% 이내, ≤240x90                                                  | ✅ 오차 0.12%, `ext=240x80`       |
| 제품 사진(5:1, 800x160) 비율 오차                                     | 1% 이내, ≤240x90                                                  | ✅ 오차 0.00%, `ext=240x48`       |
| 사진 없음/파일 사라짐 행                                              | 이미지 없음(빈 셀)                                                | ✅                                |
| exceljs 타입 충돌 우회                                                | `addImage`·`writeBuffer()` 2곳에 좁은 범위 `any`/`unknown` 캐스트 | ✅ 적용, 다른 곳은 정상 타입 유지 |

### 012-B (`GET /api/export`, ROADMAP Task 012 테스트 체크리스트)

| 항목                                                                         | 기대                                          | 실제                                                                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `from > to` (`2020-01-05` > `2020-01-01`)                                    | 400                                           | ✅ `400 VALIDATION_ERROR`, `fields.to: "시작일은 종료일보다 늦을 수 없습니다"`                                                 |
| `2026-13-01` (존재하지 않는 날짜)                                            | 400                                           | ✅ `400 VALIDATION_ERROR`, `fields.from/to: "존재하지 않는 날짜입니다"`                                                        |
| 파라미터 일부 누락(`to`만 없음)                                              | 400                                           | ✅ `400 VALIDATION_ERROR`, `fields.to: "날짜를 입력해주세요"`                                                                  |
| 파라미터 전부 누락                                                           | 400                                           | ✅ `400 VALIDATION_ERROR`, `from`/`to` 둘 다                                                                                   |
| 사진 없는 기록 501건(DB 직접 삽입) 기간 요청                                 | 422 + "기간을 좁혀주세요"                     | ✅ `422 TOO_MANY_RECORDS`, `"내보내기 대상이 500건을 초과했습니다. 기간을 좁혀주세요"`                                         |
| 정상 요청(3건, 사진 없음)                                                    | 파일명·헤더, 행 3·이미지 0                    | ✅ `Content-Disposition: attachment; filename="records_2021-06-01_2021-06-01.xlsx"`, `Content-Type` 정확, 재읽기 행 3·이미지 0 |
| 23:59:59 KST 기록                                                            | 해당 날짜 범위에 포함                         | ✅ `2021-02-10` 조회 → `BOUND-LAST-2021-02-10` 1건만 포함                                                                      |
| 00:00:00 KST(다음 날) 기록                                                   | 다음 날짜 범위에 포함, 전날 범위엔 제외       | ✅ `2021-02-11` 조회 → `BOUND-FIRST-2021-02-11` 1건만 포함                                                                     |
| Lot `2608200040→41→44→42` 순서 생성 후 내보내기                              | No 1~4, 행 순서 = 생성 순서(Lot 값 정렬 아님) | ✅ No 1~4 = Lot `40, 41, 44, 42` (Lot 값 오름차순이 아닌 생성 순서 그대로)                                                     |
| 3:1(800x267)·5:1(800x160) 샘플 JPEG를 실제 POST API로 업로드한 기록 내보내기 | 비율 오차 1% 이내, ≤240x90                    | ✅ 바코드 오차 0.12%(`ext=240x80`), 제품 오차 0.00%(`ext=240x48`)                                                              |
| PNG 사진(`image/png`)을 POST API로 업로드한 기록 내보내기                    | 기본 상자(240x90), 오류 없음                  | ✅ `ext=240x90`, 오류 없이 파일명은 `.jpg`로 저장(Q8), 다른 JPEG 기록과 섞여도 정상 처리                                       |

**결과 요약: 12개 항목 중 12개 통과 (0건 실패)**

## 확인 필요

- **Q2**(서버 타임존): 기존 `kstDayStart`/`kstNextDayStart`를 그대로 재사용해 문자열 비교로 KST 경계를 처리했고, 23:59:59/00:00:00 실측으로 정상 동작을 확인했다. 추가 변경 없음.
- **Q3**(경고 임계치 200 / 하드 상한 500): `EXPORT_HARD_LIMIT`(500)만 API에서 강제한다. 200건 경고 모달은 화면(Task 019)의 몫이며 API는 500건 초과만 422로 거부한다. 임계치 수치 자체는 현장 테스트(Task 022) 후 조정 대상으로 남겨둔다.
- **Q16**(정렬·순번): `listRecordsForExport`의 `created_at ASC, id ASC` 정렬을 그대로 신뢰해 No를 배열 순번으로 부여했다. Lot 값이 시간순과 다르게 섞여도(`40→41→44→42`) 생성 순서를 유지함을 실측으로 재확인했다.

## 변경 사항 요약

- `src/app/api/export/route.ts`(신규): `GET /api/export` Route Handler. `exportQuerySchema` 검증 → `countRecordsInRange` 상한 확인(422) → `listRecordsForExport` → `buildExportWorkbook` → xlsx 다운로드 응답. 예외는 `console.error` 후 `500 INTERNAL_ERROR`. `new Response(buffer, ...)` 호출부에서 exceljs Buffer와 `@types/node` 제네릭 Buffer의 타입 충돌을 좁은 범위 `any` 캐스트로 우회(`excel-export.ts`와 동일한 방식, 이유를 주석으로 남김).
- `scripts/check-export.ts`(신규): 임의의 xlsx 파일 경로를 받아 행 수·이미지 수·No 순번·헤더 스타일을 확인하고, 각 이미지는 워크북에 임베드된 원본 버퍼를 `readJpegSize`로 재판독해 배치된 `ext`와 비율을 비교한다(원본을 별도로 알 필요 없이 파일 자체로 검증 가능). `--rows=N`, `--images=N` 옵션으로 기대값과의 일치도 함께 확인할 수 있다.
- `scripts/seed-export-test.ts`(신규): `many`(대량 생성)/`boundary`(KST 23:59:59·00:00:00 경계)/`lots`(Lot 값과 무관한 생성 순서) 세 시나리오를 DB에 직접 삽입하는 테스트 전용 스크립트. `records-repo.ts`를 거치지 않고 `created_at`을 원하는 값으로 고정해야 하는 시나리오에만 사용하며, 정상 API 경로(사진 포함 기록 등)는 실제 `POST /api/records`로 생성했다.
- 버그 수정 없음: 012-A의 `excel-export.ts`·`jpeg-size.ts`와 011의 리포지토리·CRUD API 모두 체크리스트 전 항목을 그대로 통과해 수정하지 않았다.
- 테스트는 `DATA_DIR`를 스크래치 임시 폴더로 지정한 dev 서버(포트 3104)에서 수행했고, 종료 후 서버 프로세스를 죽이고 스크래치 폴더의 테스트 산출물(DB, xlsx 파일)을 삭제했다. 실제 `data/`는 생성되지 않았다(확인 완료).
