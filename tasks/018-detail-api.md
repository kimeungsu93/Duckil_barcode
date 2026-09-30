# Task 018: 상세 화면 API 연결 (수정·재촬영·삭제)

> ROADMAP: `docs/ROADMAP.md` Phase 5 · Task 018
> 의존: Task 007, 011, 015
> 상태: 완료 (커밋 be7f5f4, 검증은 Task 020)

## 개요

상세 페이지를 서버 컴포넌트에서 DB로 직접 조회하도록 바꾸고, 수정·재촬영은 `PATCH /api/records/[id]`(바뀐 필드와 바뀐 사진만), 삭제는 `DELETE`에 연결했다. 재촬영은 스캔 화면과 같은 `usePhotoCapture` 훅(리사이즈 포함)을 쓴다.

## 관련 파일

- 수정: `src/app/records/[id]/page.tsx`, `src/app/records/[id]/_components/record-detail-view.tsx`, `src/components/records/use-photo-capture.ts`
- 참고: `src/app/records/[id]/_components/delete-record-button.tsx`, `docs/PRD.md` §3 F4-4·F4-5, §5 S-상세-1~4 / `docs/ROADMAP.md` Q5, Q11

## 수락 기준

- [x] F4-4, F4-5를 화면에서 만족한다
- [x] 없는 id(`/records/99999`, `/records/abc`)에서 안내와 홈 이동 버튼이 보인다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `page.tsx`에서 `await params` 후 `recordIdSchema.safeParse`로 id 검증, `findRecordById` → `toRecordDto`. 없거나 형식이 틀리면 `RecordNotFound`(S-상세-2)
- [x] 2단계: `?preview=` 경로는 기존 더미(`findMockRecord`)를 그대로 사용
- [x] 3단계: `form.formState.dirtyFields`로 바뀐 필드만 골라 `updateRecord`에 전달, 재촬영한 슬롯 파일만 함께 전송. 사진 삭제는 없음 (Q11)
- [x] 4단계: 저장 성공 시 토스트 + `router.refresh()`. `updated_at`을 `key`로 써서 새 데이터로 폼을 다시 마운트
- [x] 5단계: 실패 처리 — 404는 토스트 후 홈 이동, `fields` 오류는 입력란·사진 슬롯에 표시, 그 밖은 "저장에 실패했습니다" 토스트 + 다시 시도, 입력값 유지 (S-상세-4)
- [x] 6단계: 삭제 확인 모달 → `deleteRecord` → 홈 이동 + 토스트 (F4-4, S-상세-3)
- [x] 7단계: `usePhotoCapture`에 `initialUrl` 옵션과 `reset()`을 추가해 기존 사진 URL로 시작하고 되돌릴 수 있게 함 (blob URL이 아니므로 revoke 대상에서 제외)

## 테스트 체크리스트

> Playwright MCP, 스크래치 `DATA_DIR`, 375x812. 상세 결과는 `tasks/020-integration-test.md` 1부 "Task 018 상세" 표 참고.

- [x] Product No 수정 저장 → 성공 토스트, 새로고침 후 값 유지, 원문은 그대로
- [x] 제품 사진 재촬영 저장 → 새 이미지 표시, 이전 사진 URL은 404
- [x] 삭제 확인 → 홈 이동, 목록에서 사라짐, 사진 URL 404
- [x] `PATCH` 500 응답 가로채기 → 실패 토스트, 입력값 유지

## 확인 필요

- Q11: 상세 화면 사진 비우기는 제공하지 않음(교체만). 필요하면 PATCH 명세부터 바꿔야 함
- S-상세-1(로딩)은 서버 컴포넌트가 조회를 끝낸 뒤 렌더링해 실제 경로에서는 보이지 않는다. `?preview=loading`으로만 확인한다

## 변경 사항 요약

- 상세 조회를 API 호출 대신 서버 컴포넌트의 `findRecordById`로 처리해 첫 화면에 바로 데이터가 나온다
- PATCH에는 바뀐 필드·사진만 담긴다(Task 020에서 요청 본문에 `product_no`만 들어간 것을 확인)
- 재촬영 시 새 파일이 저장된 뒤 이전 파일이 지워지고(Q5), 바꾸지 않은 슬롯의 파일명은 그대로 유지된다
