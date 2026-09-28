# Task 008-2: 참고 자료 반영 화면·더미 데이터 보완

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 008-2
> 의존: Task 008-1
> 상태: 완료

## 개요

사용자가 확보한 참고 자료(제출 표 형식, 라벨 사진)에 맞춰 사진 슬롯 안내 문구와 가로형 미리보기 비율, 더미 데이터(Product No/Lot/QR 원문), 스캐너 안내 문구를 보완했다. API 호출 없이 더미 데이터와 `?preview` 쿼리만으로 Phase 2 화면을 마무리하고 Phase 3(API 구축) 시작 조건을 충족한다.

세 개의 하위 작업(008-2-A/B/C)으로 나눠 진행했다.

- 008-2-A: 사진 슬롯 안내 문구·가로형 미리보기 비율 적용
- 008-2-B: 참고 자료 형식 더미 데이터·샘플 이미지·화면 문구 보완
- 008-2-C: 화면 검증 및 Phase 2 완료 처리 (본 문서)

## 관련 파일

- 수정: `src/components/records/photo-slot.tsx` (hint prop, `PHOTO_SLOTS` 공용 상수, 2:1 비율, object-contain)
- 수정: `src/app/scan/_components/photo-step.tsx` (로컬 SLOTS 제거, `PHOTO_SLOTS` 사용)
- 수정: `src/app/records/[id]/_components/record-detail-view.tsx` (로컬 SLOTS 제거, `PHOTO_SLOTS`·`MOCK_PHOTO_URL` 사용)
- 수정: `src/app/records/[id]/_components/record-detail-skeleton.tsx` (사진 스켈레톤 2:1)
- 수정: `src/app/_components/record-list-item.tsx` (썸네일 `size-16` → `h-14 w-20`)
- 수정: `src/app/_components/record-list.tsx` (빈 상태 문구 "코드"로 변경)
- 수정: `src/components/scanner/scanner-view.tsx` (기본 hint 문구, ROADMAP Q14)
- 수정: `src/components/records/record-fields.tsx` (Product No/Lot placeholder)
- 수정: `src/app/scan/_components/scan-flow.tsx` (`MOCK_PHOTO_URL` 사용, `DUMMY_DETECTION` 값 교체)
- 수정: `src/lib/mock/records.ts` (`MOCK_PHOTO_URL` export, SEEDS 29건을 표 형식으로 교체)
- 교체: `public/mock/barcode-sample.jpg` (800x267, 3:1), `public/mock/product-sample.jpg` (800x160, 5:1)
- 생성: `tasks/008-2-reference-alignment.md` (본 문서)
- 참고: `docs/PRD.md` §3 F2·F3, `docs/ROADMAP.md` 확인 필요 사항 Q1·Q9·Q11·Q14·Q15

## 수락 기준

- [x] 바코드/제품 사진 슬롯에 PRD F3 안내 문구가 스캔·상세 화면 모두에 보인다
- [x] 미리보기 상자가 2:1이고 사진이 `object-contain`으로 잘리지 않는다 (바코드 3:1, 제품 5:1 샘플 기준)
- [x] 상세 화면에는 비우기 버튼이 없다 (Q11 유지), 스캔 화면은 비우기 유지
- [x] 더미 목록·상세에 표 형식 Product No(`84739-DC000(G2E)` 등)와 `YYMMDD`+4자리 Lot이 보인다
- [x] 참고 라벨 실측값 `2608200040`/`2608200041`(`84739-DC000(G2E)`)이 2026-08-20 기록으로 존재한다
- [x] QR 원문(raw_text)은 라벨 텍스트 원형(`2608200040 84739DC000G2E HW 1.00`)을 그대로 두고 변환하지 않는다 (Q15)
- [x] 스캐너 안내 문구가 "코드를 사각형 안에 맞춰주세요"로 보인다 (Q14)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과, 프로덕션 빌드에서 `?preview` 쿼리가 무시된다
- [x] 375x812에서 가로 스크롤 없음(`scrollWidth <= 375`), 터치 영역 48px 이상(`size="touch"` 버튼 유지)

## 구현 단계

- [x] 1단계: `photo-slot.tsx`에 `hint` prop·`PHOTO_SLOTS` 공용 상수 추가, 미리보기 비율 4:3→2:1·object-cover→object-contain
- [x] 2단계: `photo-step.tsx`·`record-detail-view.tsx` 중복 SLOTS 제거 후 `PHOTO_SLOTS` 사용, `record-detail-skeleton.tsx`·`record-list-item.tsx` 비율 조정
- [x] 3단계: `sips --cropToHeightWidth`로 `public/mock/*.jpg`를 가로형(3:1/5:1)으로 교체, `file` 명령으로 크기 확인
- [x] 4단계: `src/lib/mock/records.ts`에 `MOCK_PHOTO_URL` 추가, SEEDS 29건을 표 형식 Product No·Lot·라벨 원형 raw_text로 교체(기존 시나리오 25건+ 모두 유지)
- [x] 5단계: `scan-flow.tsx`·`record-detail-view.tsx`의 하드코딩된 더미 사진 경로를 `MOCK_PHOTO_URL` import로 통합, `DUMMY_DETECTION` 값 교체
- [x] 6단계: `record-fields.tsx` placeholder, `scanner-view.tsx`·`record-list.tsx` 문구 변경 (Q14)
- [x] 7단계: `npm run check-all`·`npm run build` 통과 확인, Playwright MCP로 375x812 라이트/다크 화면 검증
- [x] 8단계: `docs/ROADMAP.md`·`docs/guides/project-structure.md` 갱신, 본 작업 파일 작성

## 테스트 체크리스트

> 화면 확인은 375x812 뷰포트 기준(프로덕션 빌드, `npm run start`).

- [x] 홈 목록: 총 29건, `84739-DC000(G2E)` 등 표 형식 Product No·Lot·가로형 썸네일(`h-14 w-20`, object-cover) 표시, `scrollWidth`(360) ≤ 375
- [x] `/scan` 스캐너 단계: "코드를 사각형 안에 맞춰주세요" 힌트 표시, `scrollWidth`(375) ≤ 375
- [x] `/scan` 정보 확인 단계: Product No placeholder "예: 84739-DC000(G2E)", Lot placeholder "예: 2608200040" 표시
- [x] `/scan` 사진 단계(더미 촬영 후): 슬롯별 안내 문구 표시, 미리보기 `object-fit: contain` 확인(`browser_evaluate`), 잘리지 않음
- [x] `/records/[id]` 상세: raw_text `2609280001 84739DC000G2E HW 1.00`, Product No/Lot 표시, 재촬영 버튼만 존재(비우기 없음), `object-fit: contain` 확인
- [x] 라이트/다크 테마 각 1회 확인(홈, 상세): 가로 스크롤 없음
- [x] 프로덕션 빌드(`npm run start`)에서 `/scan?preview=photo` 접근 시 `readPreview`가 `NODE_ENV === 'production'`이면 항상 `null`을 반환해 미리보기가 무시됨을 코드로 확인(`src/lib/preview-state.ts`)

## 확인 필요

- 없음 (Q1 실제 QR 원문 문자열은 여전히 미확보 상태로 ROADMAP에 남아 있음. 본 작업은 확보된 라벨 사진 기준 표기 형식만 반영)

## 변경 사항 요약

- **사진 슬롯**: `PHOTO_SLOTS` 공용 상수(kind/label/hint)로 photo-step·record-detail-view의 중복 정의를 제거했다. 미리보기 상자를 2:1로 넓히고 `object-contain`으로 바꿔 가로로 긴 사진(바코드 3:1, 제품 5:1)이 잘리지 않게 했다. 목록 썸네일은 식별 목적을 유지하기 위해 `object-cover`를 유지하되 상자만 `h-14 w-20` 가로형으로 바꿨다.
- **샘플 이미지**: 기존 800x600 두 파일을 macOS `sips --cropToHeightWidth`만으로 800x267(3:1)·800x160(5:1)로 교체했다. 파일명은 유지해 참조 경로 변경이 없다.
- **더미 데이터**: `src/lib/mock/records.ts`의 SEEDS를 `DK-xxxx`/`L2026-xxxx` 형식에서 표 형식 Product No(`NNNNN-XXXXX(XXX)`, 5개 품번 변형)·`YYMMDD`+4자리 Lot·라벨 원형 raw_text(`{lot} {P/NO 붙여쓴 원형} HW 1.00`)로 전면 교체했다(29건). 참고 라벨 실측값(`2608200040`/`2608200041`, `84739-DC000(G2E)`)을 2026-08-20 기록으로 추가했다. 중복 쌍 2개, `LONG_RAW_TEXT`, `MANUAL_RAW_TEXT` 2건, 메모 480자, 사진 조합 4종, 100자 이내 긴 값, 대소문자만 다른 미중복 사례, 지난달 기록 등 기존 시나리오는 모두 유지했다. 세 곳에 흩어져 있던 더미 사진 경로는 `MOCK_PHOTO_URL` 하나로 합쳤다.
- **문구**: 스캐너 기본 힌트를 "코드를 사각형 안에 맞춰주세요"로, 홈 빈 상태 문구를 "제품 코드를 스캔해..."로 바꿨다(Q14, QR 외 1D/Data Matrix도 인식하므로 "코드"로 일반화). `record-fields`에 실제 형식 placeholder를 추가했다.
- **결정 사항**
  - 미리보기 상자 비율은 실제 샘플(3:1, 5:1)을 하나의 상자에 모두 담을 수 있는 2:1로 절충하고 `object-contain`으로 여백을 허용했다(잘림 방지 우선).
  - 목록 썸네일은 미리보기와 달리 식별 용도이므로 `object-cover`를 유지했다(잘려도 무방, 정사각형보다 가로형이 실제 사진과 더 비슷해 식별에 유리).
  - 샘플 이미지 파일명은 그대로 두고 내용만 교체해 참조 경로 변경에 따른 리스크를 없앴다.
  - GS1 AI 형식·파이프 구분자 등 기존에 raw_text 파싱 다양성을 보여주던 샘플들은 참고 라벨이 확보된 지금은 실제 라벨 형식으로 통일하는 것이 더 유용하다고 판단해 전량 교체했다(Q1·Q15 기준 표기와 일치시킴).
- **검증**: `npm run check-all`(typecheck·lint·format:check), `npm run build` 모두 통과. Playwright MCP로 프로덕션 빌드(`npm run start`)를 375x812에서 확인: 홈/스캐너/정보 확인/사진 단계/상세 화면 스크린샷을 `.playwright-mcp/008-2/`에 남겼고, `scrollWidth` ≤ 375, 미리보기 `object-fit: contain`을 `browser_evaluate`로 확인했다. 라이트/다크 테마 각 1회 확인. `readPreview`가 `NODE_ENV === 'production'`에서 항상 `null`을 반환하는 것을 코드로 재확인했다(런타임 데이터 없이 정적 로직 확인으로 충분하다고 판단).
- **남은 이슈**: 없음. Q1(실제 QR 원문 샘플)은 여전히 미확보 상태로 Task 021(Phase 4)까지 이월된다.
