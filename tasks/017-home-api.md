# Task 017: 홈 화면 API 연결 (목록·검색·페이지네이션)

> ROADMAP: `docs/ROADMAP.md` Phase 5 · Task 017
> 의존: Task 005, 011
> 상태: 완료 (커밋 f09729d, 검증은 Task 020)

## 개요

홈 목록·검색·더 보기를 더미 데이터에서 `GET /api/records`로 바꿨다. 목록 상태는 새 훅 `useRecords`가 관리하고, 썸네일은 `/api/photos/{file}`에서 불러온다. `?preview=` 더미 경로는 화면 상태 확인용으로 그대로 남겼다.

## 관련 파일

- 생성: `src/hooks/use-records.ts`
- 수정: `src/app/_components/home-view.tsx`, `src/app/_components/record-list-item.tsx`
- 참고: `docs/PRD.md` §3 F4-2·F4-3, §5 S-홈-1~4 / `docs/ROADMAP.md` Q13

## 수락 기준

- [x] 25건이 있을 때 처음 20건, 더 보기 후 25건이 보이고 더 보기 버튼이 사라진다 (F4-2)
- [x] 대소문자가 다른 검색어로도 Product No 또는 Lot 부분 일치 기록만 보인다 (F4-3)
- [x] S-홈-1~4가 실제 API 상태로 나타난다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `useRecords(query)`: `GET /api/records`로 최초 20건 조회, 더 보기 시 `offset`을 늘려 이어 붙이고 `status`(loading·ready·error)와 `loadingMore`를 관리
- [x] 2단계: 검색어를 `usehooks-ts`의 `useDebounceValue`로 300ms 디바운스하고, 바뀌면 `offset` 0부터 다시 조회
- [x] 3단계: 요청 순번과 `AbortController`로 늦게 도착한 이전 응답이 최신 목록을 덮어쓰지 않게 함
- [x] 4단계: 더 보기 실패는 목록을 유지하고 토스트로만 알림, 최초 조회 실패는 에러 배너(S-홈-4)
- [x] 5단계: 썸네일을 `photoUrl()`(`/api/photos/{file}`, `loading="lazy"`)로 교체. 바코드 사진 우선, 없으면 제품 사진
- [x] 6단계: API 경로(`HomeViewLive`)에서 더미 데이터 import 제거. 더미는 `HomeViewPreview`에서만 사용

## 테스트 체크리스트

> Playwright MCP, 스크래치 `DATA_DIR`, 375x812. 상세 결과는 `tasks/020-integration-test.md` 1부 "Task 017 홈" 표 참고.

- [x] API로 25건 생성 후 목록 20건 → 더 보기 → 25건
- [x] 검색 `abc`로 `ABC-123` 조회, 없는 검색어로 "검색 결과가 없습니다"
- [x] DB가 빈 상태에서 "아직 기록이 없습니다"
- [x] `fetch`를 가로채 500 응답 → 에러 배너 → 다시 시도로 복구

## 확인 필요

- 없음 (검색은 대소문자 무시, 중복 판정은 대소문자 구분인 차이는 Q13 기본값대로 유지)

## 변경 사항 요약

- `src/hooks/use-records.ts`를 새로 만들어 목록·검색·더 보기 상태를 한곳에서 관리했다. `records-client.listRecords`가 `signal`을 받지 않으므로 네트워크 취소 대신 요청 순번으로 오래된 응답을 버린다
- `home-view.tsx`를 API 경로(`HomeViewLive`)와 preview 경로(`HomeViewPreview`)로 나눠, 훅을 조건부로 호출하지 않고도 `?preview=` 상태 확인을 유지했다
- Task 020 통합 테스트에서 체크리스트 4항목과 Lot 부분 일치·썸네일 로드·로딩 스켈레톤을 추가로 확인했다
