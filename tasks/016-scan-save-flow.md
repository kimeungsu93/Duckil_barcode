# Task 016: `/scan` 저장 흐름 연결

> ROADMAP: `docs/ROADMAP.md` Phase 4 · Task 016
> 의존: Task 011, 013, 014, 015
> 상태: 완료

## 개요

`/scan`의 정보 확인·사진·저장 흐름을 실제 `parseQr`/`normalizeProductNo`, `usePhotoCapture`, `records-client.createRecord`에 연결했다. 저장 성공/실패/검증 오류/사진 오류를 `ScanFlow`의 리듀서와 토스트로 처리하고, 413/415 오류에는 `record-form.ts`의 `fields`(사진 필드명)를 확장해 해당 슬롯에 오류를 표시하게 했다. Phase 4 검증 과정에서 preview 모드 사진 누락 판단이 실제 파일 기준으로 바뀌며 생긴 회귀(사진이 보이는 `save-error`/`duplicate` 미리보기에서도 "사진 없이 저장" 모달이 먼저 뜨는 문제)를 발견해 `scan-flow.tsx`만 수정해 고쳤다.

## 관련 파일

- 수정: `src/app/scan/_components/scan-flow.tsx`, `src/app/scan/_components/confirm-step.tsx`, `src/app/scan/_components/photo-step.tsx`, `src/components/records/record-fields.tsx`(`onRawTextBlur` 추가), `src/lib/record-form.ts`(413/415 `fields` 확장)
- 참고: `docs/PRD.md` §3 F1·F2·F3·F4, §4 / `docs/ROADMAP.md` Q1, Q4, Q7, Q15

## 수락 기준

- [x] `/scan`에서 스캔(또는 직접 입력)부터 저장까지 페이지 이동 없이 끝나고, 저장된 기록이 `GET /api/records`에 나온다
- [x] F1-5, F2-3, F2-4, F2-5, F3-4, F4-1과 S-스캔-3, S-스캔-5, S-스캔-6, S-스캔-7을 실제 API로 만족한다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `DETECTED` 액션에서 `parseQr` → 성공 시 `normalizeProductNo` 적용해 Product No 자동 입력, `raw_text`는 별도 보관해 수정 불가(F1-5, F2-4, F2-5)
- [x] 2단계: 직접 입력 모드 원문 blur 시(`handleRawTextBlur`) `parseQr`로 자동 입력, 이미 값이 있거나 사용자가 수정한(`dirtyFields`) 필드는 덮어쓰지 않음
- [x] 3단계: 파싱 실패 시 `parseFailed` 상태로 S-스캔-3 표시, 직접 입력 원문 비어 있으면 `MANUAL_RAW_TEXT`(`[직접입력]`)로 저장(Q7)
- [x] 4단계: `saveViaApi`로 `records-client.createRecord` 호출, 저장 중 버튼 비활성화로 중복 제출 방지
- [x] 5단계: 성공/실패/400/413/415 응답별 처리 — 400은 confirm 단계로 돌아가 필드 오류, 413/415는 `record-form.ts`가 추가한 `fields`로 해당 사진 슬롯에 오류 표시
- [x] 6단계: **다음 스캔** 시 리듀서 리셋 + `usePhotoCapture.reset()` ×2 + `scannerKey` 증가로 스캐너 재마운트
- [x] 7단계(회귀 수정): `handleSave`의 사진 누락 판단을 실제 파일 대신 화면에 보이는 슬롯 상태(`previewOverride` 있으면 그 상태, 없으면 실제 파일) 기준으로 변경
- [x] 8단계: Playwright MCP로 ROADMAP 체크리스트 7항목 전부와 413/415/400 오류 표시, preview 7종 회귀 확인 수행

## 테스트 체크리스트

> Playwright MCP. 스크래치 `DATA_DIR`·dev 서버(포트 3113), 375x812.

### ROADMAP 체크리스트 (7항목)

| #   | 시나리오                                                                      | 기대                                                                     | 실제                                                                                                                                 |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | 직접 입력(delimited 샘플) → 값 입력 → 사진 2장 업로드 → 저장                  | 성공 토스트, 완료 화면                                                   | ✅ "저장되었습니다" 토스트 + 완료 화면(Product No/Lot/사진 2장)                                                                      |
| 2   | 사진 없이 저장 → 확인 모달                                                    | 취소 시 요청 없음, 확인 시 저장                                          | ✅ 모달 표시. 취소 후 `browser_network_requests`로 POST 요청 수 불변 확인. 재시도 후 확인 클릭 시 `201` 저장됨                       |
| 3   | 같은 Product No+Lot 두 번 저장                                                | 두 번째에 성공 토스트 + 중복 경고 토스트                                 | ✅ "저장되었습니다" + "중복 기록이 있습니다" 두 토스트 동시 표시                                                                     |
| 4   | `browser_evaluate`로 `window.fetch`를 가로채 `/api/records` POST에 500 응답   | 에러 토스트, 다시 시도, 입력값 유지                                      | ✅ "저장에 실패했습니다"/"입력한 내용은 그대로 남아 있습니다" + **다시 시도** 버튼. 이전 단계로 돌아가 Product No/Lot 값 그대로 확인 |
| 5   | 필수값(Product No/Lot)을 비운 채 **다음** 클릭                                | 필드 오류 표시, 요청이 나가지 않음                                       | ✅ "Product No를 입력해주세요"/"Lot을 입력해주세요" 표시, 사진 단계로 넘어가지 않아 저장 요청 자체가 발생하지 않음                   |
| 6   | **다음 스캔** 클릭                                                            | 모든 입력과 사진 초기화                                                  | ✅ 1/3 스캐너 단계로 복귀, Product No/Lot/사진 슬롯 모두 빈 상태                                                                     |
| 7   | 직접 입력 원문란에 `84739DC000G2E`가 들어간 샘플(`84739DC000G2E\|2608200040`) | Product No `84739-DC000(G2E)` 자동 입력, 저장된 `raw_text`는 원문 그대로 | ✅ 화면에 `84739-DC000(G2E)` 자동 입력, 저장 후 `GET /api/records`에서 `raw_text: "84739DC000G2E                                     | 2608200040"`(원문 그대로) 확인 |

### 추가 확인 (사진 오류·검증 오류·preview 회귀)

| 항목                                                      | 기대                                             | 실제                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `fetch` 가로채 413 `{ fields: { product_photo: '...' } }` | 제품 사진 슬롯에 오류 표시                       | ✅ 제품 사진 슬롯에 "사진 파일이 5MB를 초과했습니다" 표시, 바코드 슬롯은 미리보기 유지, 토스트도 같은 문구로 표시                      |
| curl로 실제 API에 6MB JPEG 업로드                         | 413 + `fields.barcode_photo`                     | ✅ `413 PAYLOAD_TOO_LARGE`, `fields: { barcode_photo: "사진 파일이 5MB를 초과했습니다" }`, `data/uploads/`에 파일 남지 않음            |
| curl로 실제 API에 텍스트 파일을 사진 필드로 업로드        | 415 + `fields.product_photo`                     | ✅ `415 UNSUPPORTED_MEDIA_TYPE`, `fields: { product_photo: "지원하지 않는 이미지 형식입니다" }`                                        |
| `fetch` 가로채 400 `VALIDATION_ERROR` + `fields.lot`      | confirm 단계로 복귀, Lot에 오류 표시             | ✅ 2/3 정보 확인 단계로 복귀, Lot 필드에 "Lot 형식이 올바르지 않습니다" 표시 + "입력값을 확인해주세요" 토스트                          |
| `?preview=denied`                                         | 카메라 권한 안내 + 직접 입력 버튼                | ✅                                                                                                                                     |
| `?preview=unsupported`                                    | 즉시 직접 입력 화면(2/3)                         | ✅                                                                                                                                     |
| `?preview=parse-fail`                                     | 원문 표시 + "자동 인식 실패, 직접 입력해주세요"  | ✅                                                                                                                                     |
| `?preview=photo-error`                                    | 바코드 슬롯 오류, 제품 슬롯 미리보기             | ✅ 저장 시도 시 "사진 없이 저장" 모달도 정상 표시(바코드가 오류 상태라 미표시 사진으로 판단, 회귀 대상 아님)                           |
| `?preview=save-error`(회귀 확인)                          | 모달 없이 바로 저장 시도 → 더미 저장 실패 토스트 | ✅ **회귀 수정 확인**: "사진 없이 저장하시겠습니까?" 모달이 뜨지 않고 곧바로 "저장에 실패했습니다" 토스트(더미 저장이 의도적으로 실패) |
| `?preview=duplicate`(회귀 확인)                           | 모달 없이 바로 저장 → 성공 + 중복 경고 토스트    | ✅ **회귀 수정 확인**: 모달 없이 바로 완료 화면 + "저장되었습니다"/"중복 기록이 있습니다" 토스트                                       |
| `?preview=no-photo`(회귀 대비 확인)                       | 모달이 여전히 떠야 함                            | ✅ 사진 슬롯이 실제로 비어 있어 "사진 없이 저장하시겠습니까?" 모달 정상 표시(회귀 수정이 이 케이스를 깨뜨리지 않음을 확인)             |

## 확인 필요

- Q1: 실제 QR 샘플 미확보 상태로 기본 3규칙만 연결. Task 021에서 전용 규칙 추가 예정
- Q4: 중복은 저장 후 경고(성공 토스트와 별도)로 구현, 확인된 대로 동작
- Q7: 직접 입력 원문 비어 있으면 `MANUAL_RAW_TEXT`(`[직접입력]`) 저장, 확인된 대로 동작
- Q15: `84739DC000G2E` 계열 정규화만 검증. 다른 품번 체계는 Q1과 함께 Task 021에서 확인

## 변경 사항 요약

- **회귀 수정** (`src/app/scan/_components/scan-flow.tsx`): `handleSave`의 사진 누락 판단을 `!barcodePhoto.file || !productPhoto.file`(실제 파일 기준)에서, `previewOverride`가 있으면 그 슬롯 상태(`status !== 'preview'`)로, 없으면 기존처럼 실제 파일로 판단하도록 변경. `save-error`·`duplicate` 미리보기가 사진을 보여주면서도 "사진 없이 저장" 모달이 먼저 뜨던 문제를 고쳤고, `no-photo` 미리보기(override 없음)와 일반 모드(실제 API)는 기존 동작을 그대로 유지한다
- **후속 정리** (`scan-flow.tsx`): 사진 누락 판단과 완료 화면 사진 수를 `hasPhoto(kind)` 헬퍼 하나로 합쳐 같은 기준(화면에 보이는 슬롯)을 쓰게 했다. `?preview=duplicate` 완료 화면이 "사진 0장"으로 보이던 표시 차이가 "2장"으로 바로잡혔고, `?preview=no-photo`는 모달이 그대로 뜨는 것을 브라우저로 확인했다
- `src/lib/record-form.ts`: `precheckErrorResponse`가 413/415 응답에 `fields: { [실패한 사진 필드명]: message }`를 포함하도록 확장(기존에는 코드/메시지만 반환). `photoErrorResponse`도 `savePhotos`가 남긴 `field` 표시를 같은 방식으로 `fields`에 반영. 상태 코드와 `code` 값은 바꾸지 않았다
- `src/app/scan/_components/scan-flow.tsx`: `saveViaApi`(실제 API 저장), `SAVE_VALIDATION_ERROR`/413·415 처리 분기, `handleNextScan` 리셋 로직 추가
- `src/app/scan/_components/confirm-step.tsx`: `handleRawTextBlur`(직접 입력 원문 blur 시 자동 입력), `serverErrors` prop으로 400 필드 오류 표시
- `src/app/scan/_components/photo-step.tsx`: `onFileSelected`/`busy` prop 연결
- `src/components/records/record-fields.tsx`: `onRawTextBlur` prop 추가(원문 입력란 전용)
- 개발용 더미 원문(`DUMMY_RAW_TEXT = 'PN:84739DC000G2E;LOT:2609290001'`)은 key-value 규칙으로 파싱되어 자동 입력·정규화 동작을 그대로 보여준다
