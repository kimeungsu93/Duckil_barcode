# Task 001: 스타터 예제 코드 정리 및 라우트 골격 생성

> ROADMAP: `docs/ROADMAP.md` Phase 1 · Task 001
> 의존: 없음
> 상태: 완료

## 개요

스타터 템플릿의 예제 페이지·컴포넌트를 걷어내고, Duckil Barcode의 4개 화면(`/`, `/scan`, `/records/[id]`, `/export`)과 404 페이지를 "준비 중" 자리표시 수준으로 만든다.

## 관련 파일

- 삭제: `src/app/login/`, `src/app/signup/`, `src/components/login-form.tsx`, `src/components/signup-form.tsx`, `src/components/sections/`(hero, features, cta), `src/components/layout/footer.tsx`, `src/components/navigation/`(main-nav, mobile-nav)
- 수정: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/layout/header.tsx`, `docs/guides/project-structure.md`
- 생성: `src/app/scan/page.tsx`, `src/app/records/[id]/page.tsx`, `src/app/export/page.tsx`, `src/app/not-found.tsx`, `tasks/000-sample.md`

## 수락 기준

- [x] 4개 경로에 모두 접근할 수 있고, `/login`, `/signup`은 404다 (Playwright MCP로 확인)
- [x] 저장소 전체에서 삭제한 컴포넌트를 참조하는 곳이 없다
- [x] `npm run check-all` 통과

## 구현 단계

- [x] 1단계: 예제 페이지·컴포넌트 삭제 및 남은 import 정리
- [x] 2단계: `layout.tsx` 메타데이터를 "Duckil Barcode"로 변경 (`Toaster`, `ThemeProvider` 유지)
- [x] 3단계: 라우트 골격 생성. `/records/[id]`는 `params: Promise<{ id: string }>`를 `await`
- [x] 4단계: `not-found.tsx`에 "페이지를 찾을 수 없습니다" + 홈으로 이동 링크
- [x] 5단계: `tasks/000-sample.md` 템플릿 생성, `project-structure.md` 갱신

## 테스트 체크리스트

- [x] 375x812: `/` → "기록 목록" 표시
- [x] 375x812: `/scan` → "스캔" 표시
- [x] 375x812: `/records/1` → "기록 상세", "ID: 1" 표시
- [x] 375x812: `/export` → "내보내기" 표시
- [x] `/login`, `/signup` → 404, "페이지를 찾을 수 없습니다" 표시

## 확인 필요

- 추후 정리 검토: 예제 삭제로 사용처가 없어진 shadcn 컴포넌트(`avatar`, `checkbox`, `navigation-menu`, `sheet` 등)와 `usehooks-ts` 의존성은 Phase 2에서 쓸 수 있어 남겨 두었다. Phase 2 완료 후 미사용 시 제거를 검토한다.

## 변경 사항 요약

- 예제 파일을 삭제하고, 이를 참조하던 `page.tsx`, `header.tsx`를 정리했다.
- `header.tsx`는 훅과 모바일 메뉴가 빠져 서버 컴포넌트로 바꿨다(로고 + 테마 토글만 유지). Phase 2 Task 004에서 모바일 레이아웃으로 다시 설계한다.
- 4개 라우트와 `not-found.tsx`를 같은 자리표시 형태로 만들었다. 공통 마크업은 Task 004에서 교체되므로 추상화하지 않았다.
- `check-all`을 통과시키기 위해 `.prettierignore`에 도구가 생성하는 `.claude/`, `shrimp_data/`, `.playwright-mcp/`를 추가하고(`.playwright-mcp/`는 `.gitignore`에도 추가), `docs/` 문서를 prettier로 정리했다(내용 변경 없음, 공백·표 정렬만).
- `docs/guides/project-structure.md`의 라우트·컴포넌트 트리와 분류 규칙을 현재 구조와 Phase 2 예정 카테고리로 갱신했다.
