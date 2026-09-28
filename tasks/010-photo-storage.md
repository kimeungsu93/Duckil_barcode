# Task 010: 사진 저장소 유틸 및 GET /api/photos/[file] 구현

> ROADMAP: `docs/ROADMAP.md` Phase 3 · Task 010
> 의존: Task 003, 008-1, 008-2
> 상태: 완료

## 개요

사진 파일을 서버 파일시스템(`UPLOAD_DIR`)에 저장·삭제·조회하는 `src/lib/storage.ts`와, 저장된 사진을 제공하는 `GET /api/photos/[file]` Route Handler를 구현했다. 경로 조작(path traversal) 방지와 매직 바이트 기반 형식 검증(ROADMAP Q8)이 핵심이다.

## 관련 파일

- 생성: `src/lib/storage.ts`
- 생성: `src/app/api/photos/[file]/route.ts`
- 생성: `scripts/check-storage.ts`
- 참고: `docs/PRD.md` §4, §8 / `docs/ROADMAP.md` Q8

## 수락 기준

- [x] `savePhoto`가 크기(5MB)·MIME·매직 바이트를 검사하고 `{uuid}.jpg`로 저장한다
- [x] `deletePhoto`가 ENOENT여도 예외를 던지지 않고 경고 로그만 남긴다
- [x] `resolvePhotoPath`가 정규식 검사 후 `UPLOAD_DIR` 하위인지 재확인한다
- [x] `GET /api/photos/[file]`이 정규식 불일치 시 fs 접근 없이 400을 반환한다
- [x] 존재하지 않는 정상 파일명은 404, 존재하는 파일은 200 + 캐시 헤더를 반환한다
- [x] `npm run check-all` 중 typecheck·lint 통과 (build는 Task 009 담당이라 실행하지 않음)

## 구현 단계

- [x] 1단계: `src/lib/storage.ts` 작성 (에러 클래스, `detectImageType`, `savePhoto`, `deletePhoto`, `resolvePhotoPath`, `readPhoto`)
- [x] 2단계: `src/app/api/photos/[file]/route.ts` 작성 (Route Handler, `runtime = 'nodejs'`)
- [x] 3단계: `scripts/check-storage.ts` 작성 및 스크래치 임시 폴더에서 검증
- [x] 4단계: dev 서버(포트 3101, 스크래치 `DATA_DIR`)로 라우트 curl 확인 후 서버 종료
- [x] 5단계: `npm run typecheck`, `npm run lint`, `prettier --check` 통과

## 테스트 체크리스트

> API·비즈니스 로직 작업. curl로 확인했다 (Playwright는 Task 011-B에서 서버 기동 시 함께 진행).

- [x] `scripts/check-storage.ts`: `detectImageType`(JPEG/PNG/미확인 3종), `savePhoto`(정상 저장·413·415·매직 바이트 불일치 415·PNG 허용), `resolvePhotoPath`(정상/잘못된 파일명 5종), `readPhoto`(정상/없음/잘못된 파일명), `deletePhoto`(정상 삭제·ENOENT) — 총 15개 검증 모두 통과
- [x] 잘못된 파일명 4종(`%2e%2e%2f%2e%2e%2fetc%2fpasswd`, `abc.png`, 대문자 uuid, `uuid.jpeg`) → 모두 `400 INVALID_FILENAME`
- [x] `../etc/passwd` → 아래 "확인 필요" 참고 (본 서버로는 도달하지 않고 Next.js 기본 404로 처리됨. 안전성에는 문제 없음)
- [x] 형식은 맞지만 존재하지 않는 uuid.jpg → `404 NOT_FOUND`
- [x] 실제 저장된 파일 요청 → `200`, `content-type: image/jpeg`, `cache-control: private, max-age=31536000, immutable` 확인

**Task 011-B 재확인 (포트 3103, 별도 스크래치 `DATA_DIR`)**: `POST /api/records`로 실제 저장된 사진에 대해 위 5개 항목(잘못된 파일명 4종 400, `../etc/passwd` 알려진 차이, 존재하지 않는 uuid.jpg 404, 정상 파일 200+헤더)을 동일하게 재실행해 모두 같은 결과를 재확인했다. 상세 표는 `tasks/011-records-api.md`의 "Task 010 (사진 API)" 절 참고.

## 확인 필요

- **`../etc/passwd` 리터럴 요청은 우리 라우트에 도달하지 않음**: curl(및 대부분의 HTTP 클라이언트/서버)이 URL의 `..` 점 세그먼트를 라우팅 전에 정규화(RFC 3986)해 `/api/photos/../etc/passwd`를 `/api/etc/passwd`로 바꾼다. 이 경로는 `/api/photos/[file]` 패턴 자체와 매칭되지 않아 Next.js 앱 전역 `not-found.tsx`(HTML 404)가 응답하고, 우리 핸들러의 `INVALID_FILENAME` 코드는 나오지 않는다. 파일시스템에는 어차피 접근하지 않으므로 보안상 문제는 없으나, ROADMAP 완료 조건에 적힌 "`../etc/passwd`가 400 INVALID_FILENAME"이라는 문구와는 실제 동작이 다르다. `%2e%2e%2f`처럼 인코딩된 경로 조작 시도는 정상적으로 우리 핸들러까지 도달해 `PHOTO_FILENAME_PATTERN` 검사에서 400으로 차단됨을 확인했다. 다음 라우트/문서 작업(011 계열) 시 이 점을 참고할 것.
- `savePhoto`가 성공 후 매직 바이트가 PNG로 판별되어도 파일명 확장자는 항상 `.jpg`로 고정했다 (ROADMAP Q8). `GET` 응답의 `Content-Type`은 저장 시점이 아니라 조회 시점에 매직 바이트를 다시 읽어 판별한다.

## 변경 사항 요약

- `src/lib/storage.ts`: `server-only` 첫 줄, import 시점 fs 접근 없음. `PhotoTooLargeError`/`UnsupportedMediaError` 에러 클래스, `detectImageType(buf): 'image/jpeg' | 'image/png' | null`, `savePhoto(file: File): Promise<string>`, `deletePhoto(name: string): Promise<void>`, `resolvePhotoPath(name: string): string | null`, `readPhoto(name: string): Promise<{ buffer: Buffer; contentType } | null>` export.
- `src/app/api/photos/[file]/route.ts`: `runtime = 'nodejs'`, `params`는 `Promise<{ file: string }>`로 받아 `await`, 정규식 불일치 시 fs 접근 전에 400, `readPhoto`가 null이면 404, 성공 시 `Cache-Control: private, max-age=31536000, immutable`과 매직 바이트 기준 `Content-Type`으로 200 응답.
- `scripts/check-storage.ts`: 15개 검증(감지·저장·삭제·경로 해석·읽기) 모두 통과. `DATA_DIR` 환경변수가 `scratchpad`를 포함하는지 가드해 실수로 실제 `data/`를 건드리지 않게 함.
- `npm run typecheck`, `npm run lint`, `prettier --check` 모두 통과. `npm run build`는 지침에 따라 실행하지 않음(Task 009 담당).
- Task 009(`src/lib/db.ts`, `src/lib/records-repo.ts`, `scripts/check-repo.ts`)와 `package.json`, `scripts/register-alias.mjs`는 건드리지 않았다.
