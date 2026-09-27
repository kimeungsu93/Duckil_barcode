# Task 007: 상세 화면 UI 구현 (더미 데이터)

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 007
> 의존: Task 004, 006 (`record-fields`, `photo-slot`, `raw-text-box` 재사용)
> 상태: 완료

## 개요

`/records/[id]`에 등록·수정 일시, QR 원문, Product No/Lot/메모 수정, 사진 2장 표시·재촬영, 하단 고정 저장 버튼, 삭제(확인 모달)를 더미 데이터로 구현한다. S-상세-1·4는 개발 모드에서 `?preview=loading|save-error`로 확인한다. API는 호출하지 않는다.

## 관련 파일

- 생성: `src/app/records/[id]/loading.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `record-detail-skeleton.tsx`, `delete-record-button.tsx`, `record-not-found.tsx`
- 수정: `src/app/records/[id]/page.tsx`
- 참고: `docs/PRD.md` §3 F4, §4 PATCH/DELETE, §5 상세, ROADMAP Q5

## 수락 기준

- [x] S-상세-1 로딩 중: 스켈레톤 (`loading.tsx`, `?preview=loading`)
- [x] S-상세-2 존재하지 않는 id: "기록을 찾을 수 없습니다" + 홈으로 이동 버튼
- [x] S-상세-3 삭제 시도: 확인 모달
- [x] S-상세-4 수정 저장 성공/실패: 성공 토스트 / 실패 토스트 + 입력값 유지
- [x] 하단 고정 저장 버튼이 탭 바와 겹치지 않는다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `page.tsx` — `params`·`searchParams`를 `await`, `recordIdSchema.safeParse(id)` 후 `findMockRecord`로 조회. 없거나 잘못된 id면 `RecordNotFound`, `?preview=loading`이면 스켈레톤
- [x] 2단계: `record-detail-skeleton.tsx` — `loading.tsx`와 `?preview=loading`이 함께 쓰는 스켈레톤(헤더 포함)
- [x] 3단계: `record-not-found.tsx` — 빈 상태 + 홈으로 이동 버튼
- [x] 4단계: `record-detail-view.tsx` — 등록·수정 일시, `RawTextBox`, `updateRecordSchema` + `RecordFields`, `PhotoSlot` 2개(재촬영 = 더미 교체, 비우기), 하단 고정 저장 바(`--tab-bar-h` 위). 바뀐 내용이 없으면 저장 버튼을 "변경 사항 없음"으로 비활성화
- [x] 5단계: `delete-record-button.tsx` — 위험 스타일 버튼 + `ConfirmDialog`(destructive). 확인하면 "삭제되었습니다" 토스트 후 홈으로 이동
- [x] 6단계: `onSave`·`onDelete` prop이 없으면 더미 동작(0.8초/0.5초 지연). `?preview=save-error`면 저장 실패

## 테스트 체크리스트

> Playwright MCP, 375x812

- [x] `/records/27`(사진 2장), `/records/1` 정상 표시. `/records/9999`, `/records/abc`, `/records/0` → "기록을 찾을 수 없습니다"
- [x] 저장 바 하단 748px, 탭 바 상단 747px (테두리 1px만 겹침), 가로 스크롤 없음
- [x] 처음에는 "변경 사항 없음"(비활성화) → Lot 수정 → "저장" → 저장 → "저장되었습니다", 다시 "변경 사항 없음"
- [x] Product No를 비우고 저장 → "Product No를 입력해주세요"
- [x] 사진 비우기만 해도 저장 버튼 활성화
- [x] `?preview=save-error`: 메모 입력 후 저장 → "저장에 실패했습니다" + 다시 시도, 메모 값 유지
- [x] `?preview=loading`: 스켈레톤(`aria-busy`)
- [x] `/records/5` 삭제 → 확인 모달("기록을 삭제하시겠습니까?") → 삭제 → `/` 이동 + "삭제되었습니다"
- [x] 라이트/다크 캡처, 콘솔 오류 없음

## 확인 필요

- **더미 삭제·수정**: 더미 데이터는 모듈 상수라서 삭제하거나 수정해도 목록과 상세에 반영되지 않는다(새로고침하면 원래 값). Task 018에서 API를 연결하면 해결된다.
- **사진 비우기**: 상세 화면에서 사진을 비우고 저장하는 경로를 만들었다(`photos[kind] = null`). PRD §4 PATCH는 사진 "교체"만 적혀 있고 "삭제"는 없다. API 계약에 영향이 있으므로 Task 008-1에서 결정한다(비우기 버튼을 상세에서 숨기는 방법도 있다).
- **저장 버튼 비활성화**: 바뀐 내용이 없으면 저장을 막았다. PRD에는 없는 동작이라 Task 008-1에서 함께 본다.
- **문구**: "삭제되었거나 잘못된 주소입니다", "사진 파일도 함께 삭제되며 되돌릴 수 없습니다", "삭제에 실패했습니다"는 PRD에 없어 새로 정했다.
- 헤더 제목은 "기록 상세"로 두었다. Product No를 제목으로 쓸지는 Task 008-1에서 본다.

## 변경 사항 요약

- 상세 화면은 서버 `page.tsx`에서 id 검증과 더미 조회를 하고, 클라이언트 `record-detail-view`는 기록과 사진 URL을 props로 받는다. Task 018에서는 조회와 `onSave`/`onDelete`만 API로 바꾸면 된다.
- 저장할 때는 폼 값과 "바뀐 사진 슬롯만" 넘긴다(`DetailSaveInput.photos`). PATCH에서 바뀐 사진만 교체하는 Q5 방식에 맞췄다.
- 저장에 성공하면 폼 기준값을 새 값으로 바꾸고 수정 일시를 `nowKstIso()`로 갱신해 표시한다.
- 스켈레톤을 `_components`로 빼서 `loading.tsx`와 `?preview=loading`이 같은 화면을 쓴다.
