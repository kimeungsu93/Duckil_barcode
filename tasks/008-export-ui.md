# Task 008: 내보내기 화면 UI 구현 (더미 데이터)

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 008
> 의존: Task 004
> 상태: 완료

## 개요

`/export`에 시작일·종료일 입력, 빠른 선택(오늘·최근 7일·이번 달), 기간 요약, 엑셀 다운로드 버튼, 상태 표시 영역을 더미 데이터로 구현한다. 건수 확인과 다운로드는 `onCheckCount`, `onDownload` props로 분리하고, 지정하지 않으면 더미 동작을 쓴다. S-내보내기-2~6은 개발 모드에서 `?preview=generating|empty|warn|over-limit|error`로 확인한다.

## 관련 파일

- 생성: `src/app/export/_components/export-form.tsx`, `src/app/export/_components/export-status.tsx`
- 수정: `src/app/export/page.tsx`
- 참고: `docs/PRD.md` §3 F5, §5 내보내기, `src/lib/constants.ts`(200/500, Q3), `src/lib/schemas/export.ts`, `src/lib/time.ts`, ROADMAP Q6

## 수락 기준

- [x] S-내보내기-1 기간 미선택: 다운로드 버튼 비활성화 (F5-1 화면)
- [x] S-내보내기-2 생성 중: 스피너 + "엑셀 생성 중... 사진이 많으면 시간이 걸릴 수 있습니다"
- [x] S-내보내기-3 대상 0건: "선택한 기간에 기록이 없습니다" (F5-2 화면)
- [x] S-내보내기-4 200건 초과: "사진이 많아 생성에 시간이 걸릴 수 있습니다" 계속 진행 확인 모달 (F5-3 화면, Q3)
- [x] S-내보내기-5 500건 초과: 다운로드 거부 + "기간을 좁혀주세요" 오류 (F5-4 화면)
- [x] S-내보내기-6 생성 실패: 에러 토스트 + **다시 시도**
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `page.tsx` — `searchParams`를 `await`하고 `readPreview(params.preview, EXPORT_PREVIEWS)`를 `ExportForm`에 전달
- [x] 2단계: `export-form.tsx` — 기간 상태(처음엔 비어 있음), 빠른 선택(`todayKstDate` 기준, 날짜 계산은 UTC로 해 타임존과 무관), `exportQuerySchema`로 기간 검증과 오류 문구, 기간 요약
- [x] 3단계: 다운로드 흐름 — 건수 확인 → 0건: 기록 없음 / 500건 초과: 거부 / 200건 초과: 확인 모달 → 생성 중 → 성공 토스트 또는 실패 토스트 + 다시 시도. 기준 수치는 `EXPORT_WARN_THRESHOLD`·`EXPORT_HARD_LIMIT`만 사용
- [x] 4단계: 더미 동작 — 건수는 더미 기록을 `kstDayStart`/`kstNextDayStart` 문자열 비교로 센다(미리보기에서는 0 / 250 / 600건으로 덮어씀). 다운로드는 1.5초 뒤 성공, `?preview=error`면 실패
- [x] 5단계: `export-status.tsx` — 건수 확인 중, 생성 중, 0건, 상한 초과 표시

## 테스트 체크리스트

> Playwright MCP, 375x812

- [x] 처음 진입 시 날짜가 비어 있고 다운로드 버튼 비활성화
- [x] 빠른 선택: 오늘 → `2026-09-28~2026-09-28`, 최근 7일 → `2026-09-22~2026-09-28`, 이번 달 → `2026-09-01~2026-09-28`
- [x] 시작일 `2026-09-28` > 종료일 `2026-09-20` → "시작일은 종료일보다 늦을 수 없습니다", 버튼 비활성화
- [x] 최근 7일 다운로드 → "엑셀 생성 중..." → "엑셀 파일이 준비되었습니다"(`records_2026-09-22_2026-09-28.xlsx`)
- [x] 실제로 기록이 없는 기간(2026-01) → "선택한 기간에 기록이 없습니다"
- [x] `?preview=generating` 생성 중, `empty` 0건 안내, `warn` 250건 확인 모달 → 계속 진행 → 생성 중(버튼 비활성화), `over-limit` 600건 "기간을 좁혀주세요", `error` "엑셀 생성에 실패했습니다" + 다시 시도
- [x] 가로 스크롤 없음, 버튼·입력 48px 미만 0개, 라이트/다크 캡처, 콘솔 오류 없음

## 확인 필요

- **날짜 입력 폭**: 375px에서 시작일·종료일을 두 칸으로 나란히 두었다. 데스크톱 Chromium에서는 시작일 끝의 점 하나가 잘려 보인다. 휴대폰 기본 날짜 입력은 기기마다 다르게 그려지므로 Task 022 실기기 테스트에서 확인하고, 문제가 있으면 한 줄에 하나씩 배치한다.
- **건수 표시 시점**: 건수는 다운로드를 누를 때만 확인한다. 기간을 고를 때마다 미리 "n건"을 보여줄지는 API 호출 횟수와 관련 있어 Task 008-1에서 정한다(Q6).
- **미리보기 기간**: `?preview` 값이 있으면 바로 다운로드를 눌러볼 수 있게 기간을 최근 7일로 채워 둔다. 미리보기가 없으면 비어 있다(S-내보내기-1).
- **문구**: "기록 건수를 확인하는 중...", "기간을 다시 선택해주세요", 상한 설명, "엑셀 파일이 준비되었습니다", "기록 건수를 확인하지 못했습니다"는 PRD에 없어 새로 정했다.

## 변경 사항 요약

- `ExportForm`은 `onCheckCount(range) => Promise<number>`, `onDownload(range) => Promise<void>` props를 받는다. Task 019에서는 이 두 함수만 `GET /api/records?from&to&limit=1`(Q6)과 `GET /api/export`로 바꾸면 된다.
- 0건과 상한 초과는 화면 안의 상태 표시로, 생성 실패는 토스트로 알린다. 기간을 바꾸면 상태 표시를 지운다.
- 날짜 입력은 규칙대로 `<Input type="date">`(높이 48px)를 썼고, shadcn `calendar`는 추가하지 않았다.
