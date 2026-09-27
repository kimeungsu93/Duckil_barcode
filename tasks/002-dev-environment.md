# Task 002: 의존성 설치 및 개발·빌드 환경 설정

> ROADMAP: `docs/ROADMAP.md` Phase 1 · Task 002
> 의존: Task 001
> 상태: 완료 (실기기 HTTPS 접속은 사용자 확인 필요)

## 개요

SQLite·QR 스캔·Excel 기능에 필요한 의존성을 설치하고, 네이티브 모듈 번들링 제외, 데이터 폴더 git 제외, 환경변수, 휴대폰 테스트용 HTTPS 개발 서버를 설정한다.

## 관련 파일

- 수정: `package.json`, `package-lock.json`, `next.config.ts`, `.gitignore`, `src/lib/env.ts`, `docs/guides/project-structure.md`

## 수락 기준

- [x] `npm run build` 시 `better-sqlite3` 번들링 오류가 없다
- [ ] `npm run dev:https`로 띄운 개발 서버에 같은 Wi-Fi의 기기가 HTTPS로 접속된다 (사용자 확인 필요, 아래 참고)
- [x] `npm run check-all` 통과

## 구현 단계

- [x] 1단계: 런타임 의존성 설치 `better-sqlite3@^13.0.3`, `@zxing/browser@^0.2.1`, `@zxing/library@^0.23.0`, `exceljs@^4.4.0`
- [x] 2단계: 개발 의존성 `@types/better-sqlite3@^9.6.0`, `@types/node@^24.19.0`
- [x] 3단계: `next.config.ts`에 `serverExternalPackages: ['better-sqlite3']`
- [x] 4단계: `.gitignore`에 `/data/`, `/certificates/` 추가
- [x] 5단계: `env.ts`에 `DATA_DIR`(기본 `./data`), `UPLOAD_DIR`(= `DATA_DIR/uploads`) 추가, `VERCEL_URL` 제거
- [x] 6단계: `dev:https` 스크립트, `engines.node >=24.16` 추가

## 테스트 체크리스트

- [x] `node -e`로 `better-sqlite3` 메모리 DB 열기 → `sqlite_version()` 3.53.4 반환
- [x] 임시 Route Handler(`/api/sqlite-check`)로 `better-sqlite3` import → `npm run build` 성공, `next start`에서 `{"v":"3.53.4"}` 응답 → 확인 후 삭제
- [x] `git check-ignore data/app.db` → `/data/` 규칙으로 무시됨
- [ ] 휴대폰(같은 Wi-Fi)에서 `https://<PC IP>:3000` 접속 (사용자 확인)

## 확인 필요

- **dev:https 인증서 생성**: `next dev --experimental-https`는 mkcert로 로컬 CA를 macOS 키체인에 설치하면서 비밀번호를 묻는다. 에이전트 세션에서는 입력할 수 없어 HTTP로 대체 기동되었다. 사용자가 터미널에서 `npm run dev:https`를 한 번 실행해 비밀번호를 입력해야 한다. 휴대폰에서는 인증서 경고가 뜨며, 경고를 없애려면 mkcert 루트 CA(`mkcert -CAROOT` 경로의 `rootCA.pem`)를 기기에 설치한다.
- **인증서 대상 호스트**: Next.js는 `localhost 127.0.0.1 ::1 0.0.0.0`으로 인증서를 만든다. 휴대폰은 LAN IP로 접속하므로 인증서 호스트가 일치하지 않아 경고가 계속될 수 있다. 필요하면 `--experimental-https-key/--experimental-https-cert`로 LAN IP가 포함된 인증서를 지정한다(Task 022·023에서 재검토).
- **npm audit**: 취약점 8건(critical 1, high 5, moderate 2). `exceljs`가 의존하는 `uuid` 등이 원인이며 `npm audit fix --force`는 `exceljs@3.4.0`으로 내려가는 호환성 깨지는 변경이라 적용하지 않았다. 사내망 전용 MVP 기준으로 우선 진행하고 Task 023(배포) 전에 재점검한다.

## 변경 사항 요약

- 4개 런타임 의존성과 타입 패키지를 설치했다. `@zxing/browser`의 peer인 `@zxing/library`가 중복 없이 설치된 것을 확인했다.
- `better-sqlite3`를 `serverExternalPackages`에 등록해 번들링 대상에서 제외했다.
- `env.ts`는 `node:path`를 쓰므로 서버 전용임을 주석으로 표시했다. `NEXT_PUBLIC_APP_URL`은 ROADMAP에서 제거 대상이 아니어서 유지했다.
- `docs/guides/project-structure.md`에 `data/`, `tasks/` 폴더를 반영했다.
