# Task 009: SQLite 초기화 모듈 및 기록 리포지토리 구현

> ROADMAP: `docs/ROADMAP.md` Phase 3 · Task 009
> 의존: Task 003, 008-1, 008-2
> 상태: 완료

## 개요

`src/lib/db.ts`(지연 초기화·WAL·`user_version` 마이그레이션)와 `src/lib/records-repo.ts`(CRUD·검색·기간 조회)를 구현했다. 기록 생성·조회·수정·삭제와 Excel 내보내기(Task 012)에 필요한 리포지토리 함수를 모두 제공한다.

## 관련 파일

- 생성: `src/lib/db.ts`
- 생성: `src/lib/records-repo.ts`
- 생성: `scripts/check-repo.ts`
- 참고: `docs/PRD.md` §6, §8 / `docs/ROADMAP.md` Q2, Q9, Q13, Q16

## 수락 기준

- [x] `getDb()`가 처음 호출될 때만 `DATA_DIR`·`uploads/`를 생성하고 `data/app.db`를 연다 (import 시점 DB 미접근)
- [x] `globalThis` 싱글턴으로 개발 모드 HMR 중복 연결을 방지한다
- [x] `PRAGMA journal_mode = WAL`, `trusted_schema = OFF` 적용
- [x] PRD §6 스키마(`records`, `idx_records_created`, `idx_records_product_lot`)를 `CREATE ... IF NOT EXISTS`로 생성하고 `user_version`으로 버전 관리한다
- [x] 리포지토리 함수 8종(`insertRecord`, `findRecordById`, `listRecords`, `updateRecord`, `deleteRecord`, `existsByProductLot`, `listRecordsForExport`, `countRecordsInRange`) 모두 구현
- [x] 검색은 대소문자 무시 부분 일치(`LIKE ... ESCAPE '\'`, `%`/`_`/`\` 이스케이프) (F4-3)
- [x] 중복 판정은 trim 후 대소문자까지 정확히 일치 (Q9)
- [x] `created_at`/`updated_at`은 항상 `nowKstIso()`로 명시 삽입, SQLite 시각 함수 미사용 (Q2)
- [x] `listRecordsForExport`는 `created_at ASC, id ASC` 스캔 순서 (Q16)
- [x] 모든 쿼리가 prepared statement + 바인딩 파라미터 사용
- [x] `npm run check-all`(`typecheck`·`lint`) 통과
- [x] `npm run build` 통과, 빌드 후 `data/app.db` 미생성

## 구현 단계

- [x] 1단계: Context7(`/wiselibs/better-sqlite3`)로 `transaction()` deferred/immediate/exclusive 변형과 `RETURNING` 지원 여부 확인
- [x] 2단계: `src/lib/db.ts` 작성 (`getDb`, `MIGRATIONS` 배열, `migrate`)
- [x] 3단계: `src/lib/records-repo.ts` 작성 (입력·패치 타입 export, `escapeLike`, `buildRangeClause`/`buildListClause` 내부 헬퍼, 8개 함수)
- [x] 4단계: `scripts/check-repo.ts` 작성 및 스크래치 임시 `DATA_DIR`에서 실행
- [x] 5단계: `npm run typecheck`, `npm run lint`, `prettier --check` 통과
- [x] 6단계: `data/` 없음 확인 → `npm run build` → `data/` 여전히 없음 확인

## 테스트 체크리스트

> API·비즈니스 로직 작업. `scripts/check-repo.ts` 실측 스크립트로 확인했다 (화면 연결 없음, Playwright 대상 아님).

- [x] 빈 폴더에서 `getDb()` 호출 시 `app.db` 파일, `records` 테이블, 두 인덱스, `uploads/` 폴더가 자동 생성되고 `user_version = 1`, `journal_mode = wal`
- [x] `getDb()` 재호출이 같은 인스턴스를 반환한다(싱글턴)
- [x] CRUD: `insertRecord`(사진 미지정 시 null, created_at=updated_at) → `findRecordById` → `updateRecord`(보낸 키만 반영, 빈 patch는 그대로 반환, 없는 id는 undefined) → `deleteRecord`(삭제된 row 반환, 재삭제는 undefined)
- [x] 검색 이스케이프: `%`·`_`·`\`가 포함된 `product_no`를 리터럴로만 매치하고, 이스케이프 없이 와일드카드로 오동작하지 않음(밑줄·퍼센트 자리를 다른 문자로 바꾼 값과 매치되지 않음을 직접 확인)
- [x] 검색 대소문자 무시: `product_no`/`lot` 양쪽에서 확인
- [x] `existsByProductLot`: 정확 일치 true, trim 후 일치 true, 대소문자 다르면 false(Q9), 부분 일치 false, 없는 조합 false
- [x] 같은 `created_at`을 가진 3건을 직접 삽입 → `listRecords`는 `id DESC`, `listRecordsForExport`는 `id ASC` 순서 확인 (Q16)
- [x] 23:59:59/00:00:00 KST 경계: 전날 23:59:59 기록과 다음날 00:00:00 기록을 직접 삽입 → `countRecordsInRange`와 `listRecords`의 `from`/`to`가 정확히 하루 단위로 나뉨을 확인 (Q2)
- [x] `listRecords`의 `total`이 `limit`/`offset`과 무관하게 동일함(같은 읽기 트랜잭션에서 조회)
- [x] 주요 쿼리 5종의 `EXPLAIN QUERY PLAN` 실측: 목록 정렬(`SCAN ... USING INDEX idx_records_created`, TEMP B-TREE 없음), 기간 조회(`SEARCH ... USING INDEX idx_records_created`), 기간 건수(`SEARCH ... USING COVERING INDEX idx_records_created`), 중복 판정(`SEARCH ... USING COVERING INDEX idx_records_product_lot`), LIKE 검색(`SCAN`) — 총 49개 검증 모두 통과

## 확인 필요

- 없음. Q2(KST 시각)·Q9(중복 판정)·Q16(내보내기 정렬)은 ROADMAP 기본값 그대로 구현했다.

## 변경 사항 요약

- `src/lib/db.ts`: `server-only` 첫 줄. `getDb()`는 `globalThis.__duckilDb` 싱글턴, 처음 호출 시 `mkdirSync(DATA_DIR)`·`mkdirSync(UPLOAD_DIR)` → `new Database(path.join(DATA_DIR,'app.db'))` → `journal_mode=WAL`·`trusted_schema=OFF` → `migrate()`. `synchronous`는 기본값(FULL) 유지. `MIGRATIONS` 배열의 v0→v1 단계에서 PRD §6 `records` 테이블과 두 인덱스를 `CREATE ... IF NOT EXISTS`로 생성하고, 각 단계는 `db.transaction(...).immediate()`로 묶어 `user_version`을 함께 올린다. 이후 컬럼 추가는 배열 끝에 새 단계를 추가하는 방식.
- `src/lib/records-repo.ts`: `server-only` 첫 줄. export 타입 `InsertRecordInput`, `UpdateRecordPatch`, `ListRecordsQuery`, `ListRecordsResult`(뒤 작업이 재사용). 함수 시그니처:
  - `insertRecord(input: InsertRecordInput): RecordRow` — `RETURNING *`, `created_at`/`updated_at`은 `nowKstIso()` 1회 계산값 공유
  - `findRecordById(id: number): RecordRow | undefined`
  - `listRecords(query: ListRecordsQuery): { rows: RecordRow[]; total: number }` — `created_at DESC, id DESC`, rows·total을 같은 읽기 트랜잭션에서 조회
  - `updateRecord(id: number, patch: UpdateRecordPatch): RecordRow | undefined` — 화이트리스트 컬럼 중 `patch`에 실제로 있는 키만 SET, 빈 patch는 현재 row 반환, `RETURNING *`
  - `deleteRecord(id: number): RecordRow | undefined` — `DELETE ... RETURNING *`, 삭제된 row의 `barcode_photo`/`product_photo`로 호출 측(Task 011)이 파일을 정리
  - `existsByProductLot(productNo: string, lot: string): boolean` — 양쪽 trim 후 `=` 정확 일치(Q9)
  - `listRecordsForExport(from?: string, to?: string): RecordRow[]` — `created_at ASC, id ASC`(Q16)
  - `countRecordsInRange(from?: string, to?: string): number`
  - 내부 헬퍼 `escapeLike`, `buildRangeClause`, `buildListClause`는 export하지 않음(모듈 내부 전용)
- `scripts/check-repo.ts`: `DATA_DIR`가 `scratchpad`/`tmp`를 포함하지 않으면 즉시 중단하는 안전장치 포함. 49개 검증(생성·CRUD·검색 이스케이프·대소문자·중복 판정·동일 `created_at` 순서·KST 자정 경계·페이지네이션 일관성·`EXPLAIN QUERY PLAN` 5종) 모두 통과.
- `npm run typecheck`, `npm run lint`, `prettier --check` 모두 통과. `npm run build` 실행 후 `data/app.db`가 생기지 않음을 확인(빌드 전후 모두 `data/` 폴더 없음).
- Task 010이 담당하는 `src/lib/storage.ts`, `src/app/api/photos/**`, `scripts/check-storage.ts`와 `package.json`, `scripts/register-alias.mjs`는 건드리지 않았다.
