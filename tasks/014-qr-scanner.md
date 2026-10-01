# Task 014: QR 스캐너 카메라 로직 구현 (권한·미지원 처리)

> ROADMAP: `docs/ROADMAP.md` Phase 4 · Task 014
> 의존: Task 006
> 상태: 완료

## 개요

`@zxing/browser`의 `BrowserMultiFormatReader`로 후면 카메라 실시간 스캐너(`qr-scanner.tsx`)를 구현하고, 카메라 지원 여부 판단(`camera-support.ts`), 인식 피드백(`feedback.ts`)을 추가했다. `scanner-step.tsx`가 `next/dynamic(ssr:false)`로 스캐너를 불러오도록 연결했고, `camera-unavailable`에 `'not-found'` 사유를 추가했다. Playwright MCP 기본 컨텍스트에는 카메라 장치가 없어 실제로는 `not-found` 경로만 재현되었고, 권한 거부(`denied`) 경로 자체는 이번 검증에서 재현하지 못했다(사실대로 아래에 기록).

## 관련 파일

- 생성: `src/components/scanner/qr-scanner.tsx`, `src/lib/camera-support.ts`, `src/lib/feedback.ts`
- 수정: `src/app/scan/_components/scanner-step.tsx`(연결), `src/components/scanner/camera-unavailable.tsx`(`'not-found'` 사유 추가), `src/app/scan/_components/scan-flow.tsx`(카메라 상태 `not-found` 추가)
- 참고: `docs/PRD.md` §3 F1 / `docs/ROADMAP.md` Q7, Q14

## 수락 기준

- [x] 권한 거부 시 안내와 직접 입력 버튼이 보인다 (F1-3, S-스캔-1) — 문구·버튼은 화면에서 확인. 실제 권한 거부 트리거는 재현하지 못함(아래 확인 필요 참고)
- [x] 비-HTTPS 접속 시(또는 `mediaDevices` 없음) 권한 요청 없이 직접 입력 화면이 바로 보인다 (F1-4, S-스캔-2)
- [ ] 인식 후 1초 이내에 원문이 표시된다 (F1-2, 실기기 확인은 Task 022로 이월 — 카메라 장치가 없는 테스트 환경에서는 측정 불가)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `camera-support.ts` — `window.isSecureContext && !!navigator.mediaDevices?.getUserMedia`로 지원 여부 판단, SSR에서는 항상 false
- [x] 2단계: `qr-scanner.tsx` — `decodeFromConstraints`로 `facingMode: 'environment'`, `width/height ideal 1920x1080` 지정. 힌트에 QR_CODE, DATA_MATRIX, CODE_128, EAN_13, CODE_39 포함 (Q14)
- [x] 3단계: `<video playsInline muted autoPlay>` + 언마운트 시 `controls.stop()`으로 트랙 해제
- [x] 4단계: 오류 매핑 — `NotAllowedError`/`SecurityError` → `denied`, `NotFoundError`/`OverconstrainedError` → `not-found`, 그 외 → `unknown`(denied 문구 재사용)
- [x] 5단계: `feedback.ts` — `unlockAudio()`(사용자 제스처 안에서 AudioContext 생성·재개), `playScanFeedback()`(진동 우선, 실패 시 비프음)
- [x] 6단계: `scanner-step.tsx`를 `next/dynamic(ssr:false)`로 연결, `camera === 'checking'`일 때 스켈레톤 표시
- [x] 7단계: Playwright MCP로 권한 없음/장치 없음 컨텍스트, `mediaDevices` 제거 시나리오 확인

## 테스트 체크리스트

> Playwright MCP로 확인. 스크래치 `DATA_DIR`·dev 서버(포트 3113), 375x812.

| 항목                                                                                                                 | 기대                          | 실제                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 카메라 권한을 주지 않은/장치가 없는 컨텍스트에서 `/scan` 진입                                                        | 안내 문구·직접 입력 버튼 확인 | ⚠️ Playwright MCP 기본 컨텍스트에는 카메라 장치 자체가 없어 `getUserMedia`가 `NotFoundError`를 던짐 → `'not-found'` 화면("카메라를 찾을 수 없습니다" + 직접 입력 버튼)이 보임. 권한 거부(`denied`, `NotAllowedError`) 경로는 카메라 장치가 있어야 트리거되므로 이번 환경에서는 재현하지 못했다. `?preview=denied`로 문구·버튼 자체는 별도 확인함 |
| `browser_evaluate`(`page.addInitScript`)로 `navigator.mediaDevices`를 `Object.defineProperty(..., undefined)`로 제거 | 즉시 직접 입력 전환 확인      | ✅ `/scan` 진입 즉시 2/3 "정보 확인" 단계(직접 입력 모드)로 시작, "이 브라우저에서는 카메라를 사용할 수 없습니다" 안내 확인. `delete`로는 프로퍼티가 지워지지 않아 `Object.defineProperty`로 처리(코드 사실 기록)                                                                                                                                |
| (선택) Chromium 가짜 카메라(`--use-fake-device-for-media-stream` 등)로 인식 확인                                     | 원문 표시 확인                | ⏭️ 생략 — Playwright MCP는 실행 옵션(브라우저 실행 인자)을 직접 지정할 수 없어 가짜 카메라 플래그를 적용할 방법이 없음. Task 022(실기기 테스트)에서 재확인 예정                                                                                                                                                                                  |

## 확인 필요

- Q7: 직접 입력 시 `raw_text`는 Task 016에서 `MANUAL_RAW_TEXT`(`[직접입력]`)로 처리, 이 Task에서는 화면 전환만 담당
- Q14: 인식 포맷은 QR_CODE, DATA_MATRIX, CODE_128, EAN_13, CODE_39. 참고 라벨의 Data Matrix 인식률·`TRY_HARDER` 적용 여부는 Task 022 실기기 측정 후 결정
- 인식 1초 이내(F1-2)와 가짜 카메라 인식 확인은 테스트 환경 제약으로 이번에 확인하지 못했다. **Task 022 실기기 확인으로 이월**
- 권한 거부(`denied`) 경로의 실제 트리거는 카메라 장치가 있는 환경(실기기 또는 가짜 카메라)에서만 재현 가능하므로 **Task 022로 이월**. 문구·버튼 UI 자체는 `?preview=denied`로 별도 확인해 정상이다

## 변경 사항 요약

- `src/lib/camera-support.ts`(신규): `isCameraSupported()` — SSR에서 false, `isSecureContext && getUserMedia` 존재 여부로 판단
- `src/lib/feedback.ts`(신규): `unlockAudio()`, `playScanFeedback()`
- `src/components/scanner/qr-scanner.tsx`(신규): `'use client'`, `@zxing/browser`/`@zxing/library`를 effect 안에서 동적 import, `decodeFromConstraints`로 스트림 디코딩, 인식 1회만 콜백 후 정지
- `src/components/scanner/camera-unavailable.tsx`: `CameraUnavailableReason`에 `'not-found'` 추가, 전용 안내 문구
- `src/app/scan/_components/scanner-step.tsx`: `next/dynamic(ssr:false)`로 `QrScanner` 연결, `camera === 'checking'` 스켈레톤, `onCameraError` prop 추가
- `src/app/scan/_components/scan-flow.tsx`: `CameraStatus`에 `'not-found'` 추가, `CAMERA_ERROR` 액션으로 실제 오류 사유 반영
- 버그 수정 없음: 계획대로 구현했고 체크리스트에서 별도 결함을 발견하지 않았다

## 후속 수정 (2026-10-01): 실제 라벨 Data Matrix 인식 실패

- **증상**: 실기기에서 실제 제품 라벨(작은 Data Matrix, 검은 비닐 위)을 비추면 앱이 인식하지 못했다. 폰 기본 카메라 앱은 바로 인식했다.
- **원인**: zxing-js `DataMatrixReader`의 `WhiteRectangleDetector`가 이미지 정중앙에서 흰 여백을 찾아 확장하는 방식이다. 1080p 프레임 전체를 넣으면 실패하고, 코드만 잘라낸 이미지에서만 성공했다. 위치·배율을 조금만 바꿔도 결과가 갈렸다. `TRY_HARDER`는 1D 리더 순서에만 영향이 있어 효과가 없다.
- **수정**
  - `src/components/scanner/qr-scanner.tsx`: 디코더를 `zxing-wasm/reader`(zxing-cpp 3.1.4)로 교체. `getUserMedia` 스트림을 직접 열고, 조준 사각형 주변(1.4배)만 캔버스에 잘라 120ms 간격으로 `readBarcodes`를 호출한다. 4번에 1번은 전체 프레임을 디코딩한다. 옵션은 `textMode: 'Plain'`(기본 HRI는 GS·RS를 보이는 기호로 바꿈), `binarizer: 'LocalAverage'`, `tryHarder/tryRotate/tryInvert`. 지원 기기에서만 연속 초점과 줌 1.5를 적용한다. wasm을 불러오지 못하면 기존 zxing-js 경로로 폴백한다.
  - `src/lib/scan-roi.ts`(신규): `object-cover`를 보정해 조준 사각형을 원본 프레임 좌표로 환산하는 순수 함수.
  - `scripts/copy-zxing-wasm.mjs`(신규): `postinstall`·`predev`·`predev:https`·`prebuild`에서 `zxing_reader.wasm`을 `public/wasm/`으로 복사(사내망이라 CDN 미사용, `.gitignore` 대상).
  - `src/lib/qr-parser.ts`: 실제 원문 `[)>␞06␝VSJNW␝P846L9DC000␝T2606191J04A0000196␝CB.00␝␞␄`(ISO 15434)을 위한 `iso15434` 규칙을 맨 앞에 추가. `P`=Product No(`846L9DC000`), `T`의 앞쪽 연속 숫자=Lot(`2606191`, 사용자 확인).
- **검증**
  - Node: 참고 사진(원본·1920폭·1280폭·라벨 크롭·축소 크롭)과, 코드를 상하좌우로 옮긴 1280x720 프레임 6종을 zxing-wasm이 모두 인식.
  - Playwright(프로덕션 빌드, 캔버스 가짜 카메라 1280x720): `/scan` 진입 약 0.65초 만에 인식, Product No `846L9DC000`·Lot `2606191` 자동 입력. `/wasm/zxing_reader.wasm?v=3.1.4` 200 `application/wasm`. wasm 요청을 막으면 경고 후 zxing-js로 폴백해 동작. `NotAllowedError` 시 권한 안내 화면 정상.
  - `check-qr-parser.ts` 전 항목 통과, `--samples tests/fixtures/qr-samples.example.json` 5/5. `npm run check-all`, `npm run build` 통과.
  - 실제 카메라(반사·초점·흔들림)에서의 인식률·시간은 Task 022 실기기 측정으로 확인한다.
