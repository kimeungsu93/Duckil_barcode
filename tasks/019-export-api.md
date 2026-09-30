# Task 019: 내보내기 화면 API 연결

> ROADMAP: `docs/ROADMAP.md` Phase 5 · Task 019
> 의존: Task 008, 011, 012
> 상태: 완료 (커밋 9811600, 검증은 Task 020)

## 개요

내보내기 화면의 건수 확인과 다운로드를 실제 API에 연결했다. 다운로드를 누르면 `GET /api/records?from&to&limit=1`로 건수만 확인해 0건·200건 초과·500건 초과를 먼저 처리하고, 통과하면 `GET /api/export` 응답을 blob으로 받아 파일로 저장한다.

## 관련 파일

- 생성: `src/lib/api/export-client.ts`
- 수정: `src/app/export/_components/export-form.tsx`
- 참고: `docs/PRD.md` §3 F5, §4 export API, §5 S-내보내기-1~6 / `docs/ROADMAP.md` Q3, Q6, Q12

## 수락 기준

- [x] F5-1 ~ F5-5를 모두 만족한다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `countRecordsInRange({ from, to })`: `listRecords({ from, to, limit: 1 })`의 `total`만 반환 (Q6)
- [x] 2단계: `downloadExport({ from, to })`: `fetch` → 실패 시 JSON 에러 본문을 `ApiError`로 변환, 성공 시 `Content-Disposition`에서 파일명을 꺼내 `<a download>`로 저장하고 파일명 반환
- [x] 3단계: 건수 0 → S-내보내기-3, 500건 초과 → S-내보내기-5, 200건 초과 → 확인 모달(S-내보내기-4). 건수는 다운로드를 누를 때만 확인 (Q12)
- [x] 4단계: 서버 `422 TOO_MANY_RECORDS`도 화면의 "기간을 좁혀주세요" 상태로 처리(화면 검사를 건너뛰었거나 그 사이 건수가 늘어난 경우)
- [x] 5단계: 그 밖의 실패는 "엑셀 생성에 실패했습니다" 토스트 + 다시 시도 (S-내보내기-6). `?preview=` 경로는 기존 더미 동작 유지

## 테스트 체크리스트

> Playwright MCP, 스크래치 `DATA_DIR`, 375x812. 대량 데이터는 `scripts/seed-export-test.ts many`. 상세 결과는 `tasks/020-integration-test.md` 1부 "Task 019 내보내기" 표 참고.

- [x] 날짜 미선택 시 버튼 비활성화
- [x] 기록 없는 기간 → 안내 문구, `/api/export` 요청이 나가지 않음
- [x] 201건 → 확인 모달, 취소 시 요청 없음, 확인 시 다운로드
- [x] 501건 → 오류 문구, `/api/export` 요청이 나가지 않음
- [x] 정상 다운로드 → 파일명 `records_{from}_{to}.xlsx` 확인
- [x] `/api/export` 500 응답 가로채기 → 에러 토스트 + 다시 시도

## 확인 필요

- Q3: 경고 200건 / 상한 500건이 사내 서버 사양에 맞는지는 Task 022에서 측정
- Q12: 기간을 바꿀 때마다 건수를 미리 보여줄지는 미결. 현재는 다운로드를 누를 때만 확인

## 변경 사항 요약

- `export-client.ts`를 새로 만들어 건수 확인과 파일 다운로드를 화면 코드에서 분리했다. 에러 처리는 `records-client`의 `ApiError`를 그대로 쓴다
- `export-form.tsx`는 `preview`가 없으면 실제 API를, 있으면 더미 동작을 쓰고, 다운로드 성공 토스트에 서버가 준 실제 파일명을 보여준다
- Task 020에서 체크리스트 6항목, 생성 중 표시(S-내보내기-2), 서버 422의 화면 처리까지 확인했다
