# Task 004: 공통 UI 기반 구축 (모바일 레이아웃·탭 내비게이션·상태 컴포넌트)

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 004
> 의존: Task 003
> 상태: 완료

## 개요

4개 화면이 함께 쓰는 모바일 레이아웃, 하단 탭 바, 화면 헤더, 공통 상태 컴포넌트 4종(목록 스켈레톤·빈 상태·오류·확인 모달), 터치용 버튼 크기, 개발 모드 전용 `?preview=` 헬퍼를 만든다. 화면 내용은 Task 005~008에서 채운다.

## 관련 파일

- 생성: `src/components/layout/app-header.tsx`, `src/components/navigation/bottom-tab-bar.tsx`, `src/components/states/list-skeleton.tsx`, `src/components/states/empty-state.tsx`, `src/components/states/error-state.tsx`, `src/components/dialogs/confirm-dialog.tsx`, `src/lib/preview-state.ts`
- shadcn 추가: `src/components/ui/alert-dialog.tsx`, `src/components/ui/textarea.tsx`
- 수정: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/layout/container.tsx`, `src/components/ui/button.tsx`, `src/components/theme-toggle.tsx`, `src/app/page.tsx`, `src/app/scan/page.tsx`, `src/app/records/[id]/page.tsx`, `src/app/export/page.tsx`, `package.json`, `package-lock.json`, `docs/guides/styling-guide.md`, `docs/guides/project-structure.md`
- 삭제: `src/components/layout/header.tsx` (→ `app-header.tsx`)
- 참고: `docs/PRD.md` §5, §8, ROADMAP Q10

## 수락 기준

- [x] 4개 화면 모두 공통 레이아웃과 하단 탭 바가 적용되고, 탭 이동과 현재 탭 강조가 동작한다
- [x] 375x812 뷰포트에서 가로 스크롤이 없고, 탭·버튼 터치 영역이 48px 이상이다
- [x] 공통 상태 컴포넌트 4종이 라이트/다크 테마 모두에서 읽을 수 있다
- [x] `readPreview`가 프로덕션(`NODE_ENV=production`)에서 항상 `null`을 반환한다
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: shadcn `alert-dialog`·`textarea` 추가, import 경로 정리 (아래 확인 필요 참고)
- [x] 2단계: `button.tsx`에 `touch`(h-12)·`icon-touch`(48x48) 크기 추가, `container.tsx`에 `size="mobile"`(최대 480px, 좌우 16px) 추가, `globals.css`에 `--tab-bar-h: 4rem` 토큰 추가
- [x] 3단계: `layout.tsx`에 `viewport`(`width=device-width`, `initialScale=1`, `viewportFit=cover`)와 `BottomTabBar` 추가. `ThemeProvider`·`Toaster` 유지
- [x] 4단계: `bottom-tab-bar.tsx` — 홈·스캔·내보내기 3개 탭, `usePathname`으로 현재 탭 강조(`aria-current="page"`, `/records/*`는 홈 탭), 안전 영역 하단 여백, 고정 바와 같은 높이의 여백 div를 함께 렌더링. `HIDDEN_PATHS`는 빈 배열(Task 006에서 `/scan` 추가, Q10)
- [x] 5단계: `app-header.tsx` — `title`, `backHref?`(뒤로 가기), `action?` 슬롯, 테마 토글. 기존 `header.tsx` 삭제, 4개 페이지를 `AppHeader` + `Container size="mobile"`로 교체
- [x] 6단계: 공통 상태 컴포넌트 — `ListSkeleton({ count })`, `EmptyState({ icon, title, description?, action? })`, `ErrorState({ title, description?, onRetry?, retryLabel })`, `ConfirmDialog({ open, onOpenChange, title, description?, confirmLabel, cancelLabel, destructive?, onConfirm })`
- [x] 7단계: `preview-state.ts` — `readPreview(value, allowed)`와 `PreviewSearchParams` 타입. `env.ts`(node:path)를 import하지 않는 공용 순수 모듈
- [x] 8단계: 테마 토글 버튼을 `ghost` + `icon-touch`로 바꿔 48px 확보
- [x] 9단계: `styling-guide.md`에 모바일 우선 규칙(touch 버튼, `--tab-bar-h`, `<Input type="date">`)과 shadcn 추가 시 주의 사항 추가, `project-structure.md` 갱신

## 테스트 체크리스트

- [x] 375x812: `/`, `/scan`, `/records/1`, `/export`의 `scrollWidth`가 모두 375 (가로 스크롤 없음)
- [x] 390x844: `/records/5`, `/export`의 `scrollWidth`가 390
- [x] 터치 영역 측정: 뒤로 가기 48x48, 테마 전환 48x48, touch 버튼·date 입력 높이 48, 탭 125x64
- [x] 탭 클릭 `스캔` → `/scan`(스캔 강조), `내보내기` → `/export`, `홈` → `/`, `/records/3` 진입 시 홈 탭 강조
- [x] 임시 확인 페이지(검증 후 삭제)에서 스켈레톤·빈 상태·오류·확인 모달을 라이트/다크 모두 캡처해 가독성 확인
- [x] 4개 화면 콘솔 오류 없음 (hydration 경고 없음)
- [x] `readPreview`: 개발 모드 `['loading','error',null,null,null]`, 프로덕션 모두 `null`
- [x] `npm run build` 후 `data/` 미생성

## 확인 필요

- **shadcn 레지스트리 이상**: 현재 레지스트리(`shadcn@latest`와 프로젝트의 3.3.1 모두)가 `cn`을 npm 패키지 `cn`에서, Radix를 통합 패키지 `radix-ui`에서 import하는 코드를 내려주고 두 패키지를 설치했다. 이 두 패키지는 제거하고 기존 ui 파일과 같은 방식(`@/lib/utils`, `@radix-ui/react-alert-dialog`)으로 import를 고쳤다. 그 결과 **`@radix-ui/react-alert-dialog`가 새 의존성으로 추가**되었다(ROADMAP Task 004가 지정한 alert-dialog의 표준 의존성). 설치 과정에서 `button.tsx` 덮어쓰기는 거부해 `touch` 변형을 지켰다. 다음 shadcn 추가 때도 같은 절차가 필요하다(`styling-guide.md`에 기록).
- **스크린샷 방법**: Playwright MCP의 `browser_take_screenshot`이 이 환경에서 계속 시간 초과(폰트 로드 후 멈춤)되었다. `browser_evaluate`·클릭·콘솔 확인은 Playwright MCP로 하고, 스크린샷은 headless Chrome을 CDP로 375x812·390x844 모바일 에뮬레이션해 찍었다(세션 임시 스크립트). Task 005 이후에도 같은 문제가 있으면 같은 방법을 쓴다.
- 개발 모드에서는 Next.js 개발 표시(좌하단 N 아이콘)가 홈 탭 위에 겹친다. 프로덕션에는 나타나지 않으므로 그대로 두었다.
- 헤더 테마 토글을 `outline` + 36px에서 `ghost` + 48px로 바꿨다(터치 영역 기준). 모양이 달라졌으니 Task 008-1에서 함께 본다.

## 변경 사항 요약

- 탭 바는 고정 바와 같은 높이의 여백 div를 함께 렌더링한다. 그래서 `HIDDEN_PATHS`로 숨기면 본문 하단 여백도 같이 사라져 `layout.tsx`에 조건 로직이 필요 없다. 하단 고정 요소(상세 화면 저장 바)는 `--tab-bar-h` 토큰으로 탭 바 위에 배치한다.
- `Container`의 기존 크기(sm~full)는 `sm:px-6 lg:px-8`을 그대로 유지하고, 새 `mobile` 크기만 모든 폭에서 좌우 16px로 고정했다.
- `ConfirmDialog`는 열림 상태를 호출하는 쪽이 관리하는 제어형이다. 저장 전 사진 누락 확인, 삭제 확인, 대량 내보내기 경고에 공통으로 쓴다. 버튼은 `touch` 크기, 위험 동작은 `destructive` 옵션으로 표시한다.
- `readPreview`는 허용 목록에 있는 값만 돌려주므로 화면마다 허용값 상수를 두고 사용한다(예: 홈 `['loading','empty','no-result','error']`).
- 수정 직후 개발 서버가 옛 서버 렌더링 결과를 내보내 hydration 불일치가 한 번 났다. 코드 문제가 아니라 Turbopack 서버 캐시 문제였고, 개발 서버를 재시작해 해결했다.
