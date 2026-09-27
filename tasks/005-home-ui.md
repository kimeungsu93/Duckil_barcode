# Task 005: 홈 화면 UI 구현 (더미 데이터)

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 005
> 의존: Task 004
> 상태: 완료

## 개요

홈(`/`)에 스캔 시작 버튼, 검색창, 기록 목록(썸네일·Product No·Lot·일시), 20건 단위 더 보기를 Task 003 더미 데이터로 구현한다. S-홈-1~4 상태는 개발 모드에서 `?preview=loading|empty|no-result|error`로 확인한다. API는 호출하지 않는다.

## 관련 파일

- 생성: `src/app/_components/home-view.tsx`, `src/app/_components/record-list.tsx`, `src/app/_components/record-list-item.tsx`, `src/app/_components/record-search.tsx`
- 수정: `src/app/page.tsx`
- 참고: `docs/PRD.md` §3 F4, §5 홈, `src/lib/mock/records.ts`

## 수락 기준

- [x] S-홈-1 로딩 중: 목록 스켈레톤 표시
- [x] S-홈-2 기록 없음: "아직 기록이 없습니다" + **스캔 시작** 버튼 강조
- [x] S-홈-3 검색 결과 없음: "검색 결과가 없습니다"
- [x] S-홈-4 조회 실패: 에러 배너 + **다시 시도** 버튼
- [x] 정상 상태에서 20건 표시 후 더 보기로 나머지가 이어서 보인다 (F4-2의 화면 부분)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `page.tsx`(서버) — `searchParams`를 `await`하고 `readPreview(params.preview, HOME_PREVIEWS)`와 `q`를 `HomeView`에 전달
- [x] 2단계: `home-view.tsx`(클라이언트 컨테이너) — 검색어·표시 건수·상태를 관리하고, 더미 기록을 Product No/Lot 부분 일치·대소문자 무시로 거른다(F4-3). 검색어가 바뀌면 표시 건수를 20건으로 되돌린다
- [x] 3단계: `record-list.tsx` — `items`, `total`, `status`(`loading`/`ready`/`error`), `query`, `onLoadMore`, `onRetry`를 props로 받는 표현 컴포넌트. 상태별로 스켈레톤·오류·빈 상태·검색 결과 없음·목록 + 더 보기를 그린다
- [x] 4단계: `record-list-item.tsx` — 64px 썸네일(없으면 자리표시 아이콘), Product No, Lot, 일시(`formatKstDisplay`), `/records/[id]` 링크
- [x] 5단계: `record-search.tsx` — 검색 아이콘 + 높이 48px `type="search"` 입력

## 테스트 체크리스트

> Playwright MCP, 375x812

- [x] 정상: 첫 화면 20건, "총 27건" 표시 → 더 보기 → 27건, 더 보기 버튼 사라짐
- [x] 검색 `DK-2001` → 4건(중복 3건 + 소문자 `dk-2001` 1건, 대소문자 무시), `dk-2001` → 4건, Lot 일부 `0924` → 4건, `zzz` → "검색 결과가 없습니다"
- [x] 첫 항목 클릭 → `/records/27` 이동
- [x] `?preview=loading` 스켈레톤, `?preview=empty` 빈 상태 + 스캔 시작 버튼 1개, `?preview=no-result` 검색 결과 없음, `?preview=error` 오류 + 다시 시도 → 누르면 정상 목록 20건
- [x] 4개 상태 모두 `scrollWidth` 375, `main` 안 버튼·링크·입력 중 높이 48px 미만 0개
- [x] 라이트/다크 캡처, 콘솔 오류 없음

## 확인 필요

- ROADMAP 검증 기준에는 `DK-2001` 검색이 3건으로 적혀 있었지만, PRD F4-3(대소문자 무시)에 따르면 소문자 `dk-2001` 기록도 걸려 4건이 맞다. 중복 판정(Q9, 대소문자 구분)과 검색(대소문자 무시)의 기준이 다르다는 점은 Task 008-1에서 다시 본다.
- 검색은 입력할 때마다 바로 거른다(더미 27건). Task 017에서 API로 바꿀 때 디바운스를 넣는다. 검색어는 URL `?q=`의 초기값만 읽고, 입력 중에는 URL을 갱신하지 않는다.
- 기록이 하나도 없을 때(S-홈-2)는 상단 스캔 시작 버튼을 숨기고 빈 상태 안의 버튼만 보여준다. 같은 버튼이 두 개 보이는 것을 피하려는 결정이다.
- 오류 문구 "목록을 불러오지 못했습니다"는 PRD에 정해진 문구가 없어 새로 정했다.

## 변경 사항 요약

- 표현 컴포넌트(`record-list`, `record-list-item`, `record-search`)는 `src/lib/mock`을 import하지 않는다. 썸네일 URL은 `home-view`가 `mockPhotoUrl()`로 만들어 넘긴다(바코드 사진 우선, 없으면 제품 사진). Task 017에서는 `home-view`만 API 호출로 바꾸면 된다.
- 썸네일은 `next/image`에 `unoptimized`를 켰다. 사진 경로가 더미(`/mock`), API(`/api/photos`), blob URL로 바뀌기 때문이다.
- `page.tsx`가 `searchParams`를 읽으므로 홈은 요청마다 렌더링되는 동적 페이지가 되었다.
