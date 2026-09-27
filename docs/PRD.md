# 📋 PRD: 제품 QR 스캔·기록 웹앱 (Duckil Barcode) MVP

## 1. 개요

현장 작업자가 **휴대폰 브라우저**로 제품 QR을 스캔해 **Product No / Lot**를 추출하고,
**바코드(라벨) 사진**과 **제품 사진**을 함께 촬영·저장한 뒤, 모은 기록을 **사진이 삽입된 Excel**로 내보내는 웹앱.

| 항목        | 내용                                            |
| ----------- | ----------------------------------------------- |
| 대상 사용자 | 입고/검수/출하 현장 작업자 (로그인 없음)        |
| 사용 환경   | 휴대폰 브라우저 (iOS Safari, Android Chrome)    |
| 배포        | 사내 서버 (Node.js 24.16 + HTTPS 리버스 프록시) |
| 저장소      | SQLite (기록) + 서버 파일시스템 (사진)          |

### 해결하려는 문제

- 라벨 정보를 수기로 옮겨 적으면서 생기는 **오기·누락**
- 사진과 제품 정보가 **따로 관리**되어 추적이 어려움
- 보고용 자료(엑셀)를 **수작업으로 취합**하는 시간 낭비

## 2. 핵심 사용자 흐름

```
[홈] ─ 스캔 시작 ─▶ [QR 스캔] ─ 인식 ─▶ [정보 확인/수정] ─▶ [사진 촬영 ×2] ─▶ [저장] ─▶ [홈: 목록에 추가]
  │
  └─ 내보내기 ─▶ [기간 선택] ─▶ Excel(.xlsx, 사진 포함) 다운로드
```

1. 홈에서 **스캔 시작** → 후면 카메라가 열림
2. QR 인식 시 진동/효과음 → **Product No, Lot 자동 입력** (원문도 함께 보관)
3. 값 확인 후 필요하면 수정 (자동 분리 실패 시 직접 입력)
4. **바코드 사진**, **제품 사진** 촬영 (각 1장, 재촬영 가능)
5. 저장 → 동일 Product No+Lot 존재 시 **중복 경고 토스트** (저장은 그대로 진행됨)
6. 연속 작업을 위해 **"다음 스캔"** 버튼 제공 (같은 화면에서 초기화 후 재시작)

## 3. 기능 요구사항 (MVP 범위)

### F1. QR 스캔

- 후면 카메라 실시간 스캔 (`@zxing/browser`, QR 우선 + 주요 1D 바코드 지원)
- 카메라 권한 거부/미지원 시 안내 문구 + **직접 입력** 대체 경로 제공
- 스캔 원문(`rawText`)은 파싱 성공 여부와 무관하게 항상 그대로 저장

**수용 기준**

- [ ] HTTPS 환경에서 `/scan` 진입 시 후면 카메라(`facingMode: environment`)가 자동으로 열린다
- [ ] QR이 인식되면 1초 이내에 진동(가능 기기) 또는 효과음과 함께 원문이 화면에 표시된다
- [ ] 카메라 권한을 거부하면 카메라 화면 대신 "카메라 권한이 필요합니다" 안내와 **직접 입력** 버튼이 보인다
- [ ] `getUserMedia` 미지원 브라우저(또는 비-HTTPS 환경)에서는 카메라 시도 없이 즉시 직접 입력 화면으로 전환된다
- [ ] 스캔에 성공하면 `raw_text`에 원문이 그대로 보관되고, 사용자가 이후 값을 수정해도 `raw_text`는 변하지 않는다

### F2. Product No / Lot 파싱

- **QR 샘플 미확정** → 파서를 교체 가능한 모듈(`src/lib/qr-parser.ts`)로 분리
- MVP 기본 규칙(아래 순서대로 시도, 첫 성공 규칙 채택):
  1. `키:값` 또는 `키=값` 구분자 (예: `PRODUCT:1234\nLOT:5678`)
  2. GS1 AI 형식 `(01)...(10)...` (GTIN=Product No, AI 10=Lot)
  3. 구분자(`|`, `;`, `,`) 기반 위치 분리 (설정 가능한 인덱스)
- 모든 규칙이 실패하면 원문만 표시하고 Product No / Lot 입력 필드를 **빈 값 + 직접 입력**으로 전환
- 👉 실제 샘플 확보 후 전용 규칙 추가 (로드맵 Phase 4, Task 013)

**수용 기준**

- [ ] `lib/qr-parser.ts`는 `parseQr(rawText: string): { productNo: string | null; lot: string | null; matchedRule: string | null }` 형태의 순수 함수로 분리되어 있다
- [ ] 규칙은 배열로 등록되어 있어 새 규칙을 앞/뒤에 추가만 하면 우선순위를 바꿀 수 있다
- [ ] 파싱 실패 시 "자동 인식 실패, 직접 입력해주세요" 안내와 함께 두 입력 필드가 비어 있는 채로 활성화된다
- [ ] 파싱에 성공해도 사용자가 값을 수정할 수 있다 (자동 입력은 항상 사용자 수정 가능)

### F3. 사진 촬영

- `<input type="file" accept="image/*" capture="environment">` 사용 (iOS/Android 공통 가장 안정적)
- 업로드 전 **클라이언트 리사이즈** (긴 변 1600px, JPEG 품질 0.8, `<canvas>` 사용) → 용량·업로드 시간 절감
- 바코드 사진, 제품 사진 각 1장 (둘 다 **선택 항목**, 저장 시 누락되어도 경고만 표시하고 저장 허용)
- 재촬영 시 이전 미리보기/파일을 교체 (동일 슬롯 1장 유지)

**수용 기준**

- [ ] 사진 선택 즉시 미리보기가 표시되고, 리사이즈 후 예상 용량(대략치)이 로그/디버그로 확인 가능하다
- [ ] 리사이즈 결과물은 항상 `image/jpeg`이며 긴 변이 1600px를 넘지 않는다
- [ ] 캔버스 디코딩이 실패하는 이미지(예: 일부 HEIC)를 선택하면 "지원하지 않는 이미지 형식입니다. 다시 촬영해주세요" 오류를 표시하고 해당 슬롯은 비워둔다
- [ ] 사진 없이 저장을 시도하면 "사진 없이 저장하시겠습니까?" 확인 모달이 뜨고, 확인 시 저장이 진행된다

### F4. 저장 / 목록 / 상세

- 저장 시 동일 `Product No + Lot` 존재하면 **중복 경고** (저장은 허용, 응답에 `duplicate: true` 포함)
- 홈: 최근 기록 목록(최신순, 페이지네이션), 썸네일, Product No, Lot, 일시 표시, Product No/Lot 검색
- 상세: 정보 수정, 사진 재촬영(교체), 삭제(사진 파일도 함께 삭제)

**수용 기준**

- [ ] 동일 Product No+Lot 기록이 이미 있는 상태에서 저장하면 `POST /api/records` 응답에 `duplicate: true`가 담기고, 클라이언트는 저장 성공 토스트와 별도로 "중복 기록이 있습니다" 경고 토스트를 함께 보여준다
- [ ] 홈 목록은 최초 진입 시 최근 20건을 최신순으로 보여주고, "더 보기"로 페이지네이션된다
- [ ] 검색어 입력 시 Product No 또는 Lot에 부분 일치하는 기록만 표시된다 (대소문자 무시)
- [ ] 상세 화면에서 기록을 삭제하면 DB row와 `data/uploads/`의 사진 파일이 모두 제거된다
- [ ] 상세 화면에서 사진을 재촬영하면 기존 파일은 삭제되고 새 파일명으로 교체된다 (파일명 유실 없이 DB 값도 갱신)

### F5. Excel 내보내기

- 기간(시작일~종료일) 선택 후 다운로드
- 컬럼: No, 일시, Product No, Lot, QR 원문, 메모, **바코드 사진**, **제품 사진**
- 사진은 셀 내 썸네일로 삽입 (`exceljs`), 행 높이 자동 조정
- 서버 Route Handler에서 생성 → 휴대폰에서 바로 다운로드/공유
- 대량 기간 선택 시 안내/제한 (§8 운영상 주의점 참조)

**수용 기준**

- [ ] `/export`에서 시작일/종료일을 선택하지 않으면 다운로드 버튼이 비활성화된다
- [ ] 선택 기간에 기록이 0건이면 다운로드 대신 "선택한 기간에 기록이 없습니다" 안내가 표시된다
- [ ] 선택 기간의 기록 수가 경고 임계치(200건)를 넘으면 "사진이 많아 생성에 시간이 걸릴 수 있습니다" 안내 후 계속 진행 확인을 받는다
- [ ] 선택 기간의 기록 수가 하드 상한(500건)을 넘으면 다운로드를 거부하고 "기간을 좁혀주세요" 오류를 표시한다
- [ ] 생성된 xlsx 파일을 열면 각 사진 컬럼에 썸네일 이미지가 셀 안에 삽입되어 있고, 사진이 없는 기록은 빈 셀로 표시된다

### 범위 외 (Out of Scope)

- 로그인/권한 관리 (사내망 URL 공유로 운영)
- 오프라인 저장 후 동기화
- 다중 사진(3장 이상), 사진 편집
- 거래처/품목 마스터 연동

## 4. API 명세

공통 규칙:

- 모든 입력 검증은 Zod 스키마로 서버(Route Handler)에서 재검증한다 (클라이언트 검증은 UX용, 서버 검증이 최종 방어선)
- 에러 응답 공통 포맷: `{ "error": { "code": string, "message": string, "fields"?: Record<string, string> } }`
- 사진 파일: `image/jpeg`, `image/png`만 허용, 파일 1개당 서버 상한 **5MB** (클라이언트 리사이즈로 통상 1MB 이내가 되지만, 우회 업로드에 대비한 서버측 안전장치)

### 입력 검증 규칙 (Zod 기준)

| 필드                   | 규칙                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `raw_text`             | string, 필수, 1~2000자                                                                          |
| `product_no`           | string, 필수, 1~100자, 앞뒤 공백 trim                                                           |
| `lot`                  | string, 필수, 1~100자, 앞뒤 공백 trim                                                           |
| `memo`                 | string, 선택, 최대 500자                                                                        |
| `barcode_photo`        | file, 선택, `image/jpeg`\|`image/png`, 최대 5MB                                                 |
| `product_photo`        | file, 선택, `image/jpeg`\|`image/png`, 최대 5MB                                                 |
| `from` / `to` (export) | string, 필수, `YYYY-MM-DD` 정규식, `from <= to`                                                 |
| `id` (path)            | 정수, 1 이상                                                                                    |
| `file` (photos path)   | `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$` (uuid v4 + `.jpg`)만 허용 |

### `POST /api/records`

기록 생성 (multipart/form-data)

- 요청 필드: `raw_text`, `product_no`, `lot`, `memo?`, `barcode_photo?`(file), `product_photo?`(file)
- 성공 응답: `201 Created`
  ```json
  {
    "id": 101,
    "raw_text": "...",
    "product_no": "ABC-123",
    "lot": "L2024001",
    "memo": null,
    "barcode_photo": "5f2c...uuid....jpg",
    "product_photo": "a91b...uuid....jpg",
    "created_at": "2026-09-28T14:05:00+09:00",
    "updated_at": "2026-09-28T14:05:00+09:00",
    "duplicate": false
  }
  ```
- 오류 응답:
  - `400 VALIDATION_ERROR` — 필수값 누락/형식 오류 (`fields`에 필드별 메시지)
  - `413 PAYLOAD_TOO_LARGE` — 사진이 5MB 초과
  - `415 UNSUPPORTED_MEDIA_TYPE` — 이미지가 아닌 파일 업로드
  - `500 INTERNAL_ERROR` — DB/파일 저장 실패 (저장 실패 시 이미 쓰여진 사진 파일은 롤백 삭제)

### `GET /api/records`

목록/검색 조회

- 쿼리: `q?`(Product No/Lot 부분 일치), `limit?`(기본 20, 최대 100), `offset?`(기본 0)
- 성공 응답: `200 OK` `{ "items": [Record...], "total": number }`

### `GET /api/records/[id]`

상세 조회

- 성공: `200 OK` (Record 단일 객체)
- 오류: `404 NOT_FOUND` — 존재하지 않는 id

### `PATCH /api/records/[id]`

부분 수정 (multipart/form-data, 모든 필드 선택적 — 보낸 필드만 갱신, 사진은 보내면 기존 파일을 교체)

- 요청 필드: `product_no?`, `lot?`, `memo?`, `barcode_photo?`(file), `product_photo?`(file)
- 성공: `200 OK` (갱신된 Record, `updated_at` 갱신)
- 오류: `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `413`/`415` (사진 관련), `500 INTERNAL_ERROR`
- 사진 교체 시 서버는 새 파일 저장 성공을 확인한 뒤 기존 파일을 삭제한다 (교체 실패 시 기존 파일 보존)

### `DELETE /api/records/[id]`

- 성공: `204 No Content`
- 오류: `404 NOT_FOUND`
- 삭제 시 `barcode_photo`, `product_photo`에 해당하는 파일을 `data/uploads/`에서 함께 삭제 (파일이 이미 없으면 조용히 무시하고 로그만 남김)

### `GET /api/photos/[file]`

- `file` 파라미터가 검증 규칙(uuid v4 + `.jpg`)에 맞지 않으면 **경로 조작 방지**를 위해 즉시 `400 INVALID_FILENAME` 반환 (파일시스템 조회 자체를 하지 않음)
- 정상 형식이지만 파일이 없으면 `404 NOT_FOUND`
- 성공: `200 OK`, `Content-Type: image/jpeg`, 캐시 헤더(`Cache-Control: private, max-age=31536000, immutable`) — 파일명이 uuid라 내용 불변 전제

### `GET /api/export`

- 쿼리: `from`(필수, `YYYY-MM-DD`), `to`(필수, `YYYY-MM-DD`)
- 성공: `200 OK`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="records_{from}_{to}.xlsx"`
- 오류:
  - `400 VALIDATION_ERROR` — 날짜 형식 오류 또는 `from > to`
  - `422 TOO_MANY_RECORDS` — 선택 기간 기록 수가 하드 상한(500건) 초과, 메시지에 "기간을 좁혀주세요" 포함
  - `500 INTERNAL_ERROR` — 엑셀 생성 실패

## 5. 화면별 상태 및 예외 처리

### 홈 (`/`)

| 상태            | 처리                                             |
| --------------- | ------------------------------------------------ |
| 로딩 중         | 목록 스켈레톤 표시                               |
| 기록 없음(초기) | "아직 기록이 없습니다" + **스캔 시작** 버튼 강조 |
| 검색 결과 없음  | "검색 결과가 없습니다"                           |
| 목록 조회 실패  | 에러 배너 + **다시 시도** 버튼                   |

### 스캔 (`/scan`)

| 상태                         | 처리                                                    |
| ---------------------------- | ------------------------------------------------------- |
| 카메라 권한 거부             | 안내 문구 + **직접 입력** 버튼 노출                     |
| 카메라 미지원(비-HTTPS 포함) | 카메라 시도 없이 직접 입력 화면으로 즉시 전환           |
| QR 인식/파싱 실패            | 원문 표시 + Product No/Lot 빈 입력 필드 활성화          |
| 사진 디코딩 실패(HEIC 등)    | 해당 슬롯 오류 메시지, 재촬영 유도                      |
| 사진 업로드(저장) 실패       | 에러 토스트 + **다시 시도** 버튼, 입력값 유지           |
| 중복 Product No+Lot          | 저장은 진행, 완료 후 "중복 기록이 있습니다" 경고 토스트 |
| 사진 미첨부 저장 시도        | 확인 모달 ("사진 없이 저장하시겠습니까?")               |

### 상세 (`/records/[id]`)

| 상태                | 처리                                         |
| ------------------- | -------------------------------------------- |
| 로딩 중             | 스켈레톤                                     |
| 존재하지 않는 id    | "기록을 찾을 수 없습니다" + 홈으로 이동 버튼 |
| 삭제 시도           | 확인 모달, 확인 시 사진 파일 포함 삭제       |
| 수정 저장 성공/실패 | 성공 토스트 / 실패 토스트 + 값 유지          |

### 내보내기 (`/export`)

| 상태                    | 처리                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| 기간 미선택             | 다운로드 버튼 비활성화                                           |
| 생성 중                 | 스피너 + "엑셀 생성 중... 사진이 많으면 시간이 걸릴 수 있습니다" |
| 대상 0건                | "선택한 기간에 기록이 없습니다"                                  |
| 경고 임계치(200건) 초과 | 계속 진행 확인 모달                                              |
| 하드 상한(500건) 초과   | 다운로드 거부 + "기간을 좁혀주세요" 오류                         |
| 생성 실패               | 에러 토스트 + 다시 시도                                          |

## 6. 데이터 모델

```sql
CREATE TABLE records (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_text           TEXT    NOT NULL,          -- QR 원문
  product_no         TEXT    NOT NULL,
  lot                TEXT    NOT NULL,
  memo               TEXT,
  barcode_photo      TEXT,                      -- 파일명 (data/uploads/, uuid.jpg)
  product_photo      TEXT,
  created_at         TEXT    NOT NULL,          -- KST(ISO 8601, +09:00) 문자열, 애플리케이션에서 생성 (§8 참조)
  updated_at         TEXT    NOT NULL
);
CREATE INDEX idx_records_created ON records(created_at);
CREATE INDEX idx_records_product_lot ON records(product_no, lot);
```

- 사진 파일: `data/uploads/{uuid}.jpg` (DB에는 파일명만 저장)
- DB 파일: `data/app.db` (`data/` 폴더 통째로 백업하면 전체 백업 완료)
- `created_at`/`updated_at`은 SQLite의 `datetime('now','localtime')` 기본값에 **의존하지 않는다** (§8 참조) — 애플리케이션 코드에서 KST 시각을 계산해 명시적으로 INSERT/UPDATE한다

## 7. 기술 스택 및 구조

| 영역        | 선택                                               | 이유                                                                                                     |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 프레임워크  | Next.js 15.5.3 App Router (기존 스타터, Turbopack) | 화면 + API를 한 서버에서 운영                                                                            |
| DB          | SQLite + `better-sqlite3`                          | 별도 DB 서버 불필요, 사내 서버 운영 간단 (Next 설정에 `serverExternalPackages: ['better-sqlite3']` 필요) |
| QR 인식     | `@zxing/browser`                                   | iOS Safari 포함 크로스 브라우저 지원                                                                     |
| Excel       | `exceljs`                                          | 이미지 삽입 지원                                                                                         |
| 검증        | Zod                                                | API 입력값 서버 검증 (§4)                                                                                |
| UI          | shadcn/ui(new-york) + TailwindCSS v4 (모바일 우선) | 기존 스타터 활용                                                                                         |
| 알림/토스트 | sonner                                             | 저장 성공/중복 경고/에러 토스트                                                                          |
| 런타임      | Node.js 24.16                                      | 사내 서버 표준 런타임                                                                                    |

### 라우트

| 경로                        | 설명                                                     |
| --------------------------- | -------------------------------------------------------- |
| `/`                         | 홈: 스캔 시작 버튼 + 최근 기록 목록/검색                 |
| `/scan`                     | 스캔 → 정보 확인 → 사진 촬영 → 저장 (단일 페이지 단계형) |
| `/records/[id]`             | 상세/수정/삭제                                           |
| `/export`                   | 기간 선택 + Excel 다운로드                               |
| `POST /api/records`         | 기록 생성 (multipart: 필드 + 사진 0~2장)                 |
| `GET /api/records`          | 목록/검색                                                |
| `GET /api/records/[id]`     | 상세                                                     |
| `PATCH /api/records/[id]`   | 수정                                                     |
| `DELETE /api/records/[id]`  | 삭제 (사진 파일 포함)                                    |
| `GET /api/photos/[file]`    | 사진 제공 (uuid.jpg 형식만 허용)                         |
| `GET /api/export?from=&to=` | Excel 생성                                               |

## 8. 비기능 요구사항 및 운영상 주의점

- **HTTPS 필수**: 휴대폰 브라우저는 HTTPS(보안 컨텍스트)에서만 카메라를 허용
  - 사내 서버: nginx 리버스 프록시 + 인증서(사내 CA 또는 도메인 인증서)
  - 로컬 개발: `next dev --experimental-https`로 휴대폰 테스트
- **서버 시간대(KST) 처리**: `datetime('now','localtime')`은 SQLite/서버 OS의 시스템 타임존에 의존하므로, 사내 서버의 OS 타임존 설정이 어긋나면 기록 시각이 틀어질 수 있다. 다음 두 가지를 함께 적용한다.
  1. Node 프로세스 환경변수 `TZ=Asia/Seoul`을 고정 (systemd/PM2 설정에 명시)
  2. DB 컬럼 기본값에 의존하지 않고, 애플리케이션 코드(`new Date()` → KST 오프셋 계산 → ISO 8601 `+09:00` 문자열)에서 `created_at`/`updated_at` 값을 만들어 명시적으로 INSERT/UPDATE
- **삭제 시 파일 정리**: 레코드 삭제(`DELETE /api/records/[id]`) 시 DB row뿐 아니라 `barcode_photo`, `product_photo`가 가리키는 실제 파일을 `data/uploads/`에서 함께 삭제한다. 파일이 이미 없어도 요청은 성공 처리하고 로그만 남긴다 (고아 레코드 방지).
- **경로 조작(path traversal) 방지**: `GET /api/photos/[file]`는 `file` 값이 `uuid.jpg` 정규식과 정확히 일치할 때만 파일시스템을 조회한다. `../`, 절대경로, 다른 확장자 등은 파일시스템 접근 전에 `400`으로 즉시 거부하고, 실제 파일 경로는 항상 `path.join(UPLOAD_DIR, file)` 후 `path.resolve` 결과가 `UPLOAD_DIR` 하위인지 재확인한다.
- **iOS HEIC 사진 처리**: `<input capture="environment">`로 직접 촬영한 사진은 대부분 브라우저가 JPEG로 반환하지만, 갤러리에서 기존 HEIC 파일을 선택하는 경우가 있을 수 있다. 클라이언트 리사이즈는 `<canvas>`에 이미지를 그려 JPEG로 재인코딩하는 방식이므로, canvas가 디코딩 가능한 이미지는 그대로 HEIC→JPEG 변환 효과를 얻는다. canvas 디코딩 자체가 실패하는 경우(F3 참조)에는 사용자에게 재촬영을 안내한다(브라우저마다 HEIC 디코딩 가능 여부가 다르므로 100% 보장하지 않음).
- **대량 내보내기 용량/시간 가이드**: 사진 1장은 리사이즈 후 통상 150~400KB. 기록 200건(사진 최대 400장) 기준 워크북에 삽입되는 이미지 총량이 수십~100MB대에 이를 수 있어 생성 시간이 수 초~수십 초로 늘어난다. 이에 따라 §3(F5)/§4(export API)에 정의한 대로 **경고 임계치 200건, 하드 상한 500건**을 적용한다. 상한을 넘기면 API가 `422`를 반환하고 화면은 기간을 좁히도록 안내한다.
- 모바일 우선: 한 손 조작, 큰 버튼(최소 48px), 세로 화면 기준
- 성능(참고치, 사내 Wi-Fi 기준): 스캔 인식 1초 이내, 사진 2장 저장 3초 이내
- 보안: 접근 제한 없음(사내망 전제) — 외부 인터넷 노출 금지 권장

## 9. 성공 지표 (MVP 검증)

- 1건 등록 소요 시간: **30초 이내** (스캔~저장)
- Product No/Lot 자동 입력 성공률: 샘플 규칙 반영 후 **95% 이상**
- 수기 취합 대비 보고서 작성 시간 단축

## 10. 미결 사항

- [ ] **실제 QR 샘플 원문** (Product No/Lot 위치) → 전용 파서 규칙 (Task 013)
- [ ] 사내 서버 OS/Node 설치 가능 여부, HTTPS 인증서 방식(사내 CA vs 공인 도메인 인증서)
- [ ] 사내 서버 OS 타임존이 이미 `Asia/Seoul`로 설정되어 있는지 확인 필요 (§8 KST 처리와 별개로 이중 확인)
- [ ] 작업자 이름 등 추가 기록 항목 필요 여부
- [ ] 내보내기 경고 임계치(200건)/하드 상한(500건) 수치가 실제 사내 서버 사양(메모리/디스크 I/O)에 적합한지 현장 테스트 후 조정 필요
