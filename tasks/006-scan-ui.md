# Task 006: 스캔 화면 단계형 UI 구현 (더미 데이터)

> ROADMAP: `docs/ROADMAP.md` Phase 2 · Task 006
> 의존: Task 004
> 상태: 완료

## 개요

`/scan`에 스캐너 → 정보 확인·수정 → 사진 2장 → 저장 완료 단계 흐름을 더미 데이터로 구현한다. 카메라·QR 파서·리사이즈·API는 연결하지 않고, 값과 콜백을 props로 받는 컴포넌트로 만들어 Phase 4에서 공급원만 바꾼다. S-스캔-1~7은 개발 모드에서 `?preview=denied|unsupported|parse-fail|photo-error|save-error|duplicate|no-photo`로 확인한다. 상세 화면(Task 007)과 함께 쓰는 공용 컴포넌트는 006-A, 흐름은 006-B로 나눠 진행했다.

## 관련 파일

- 생성(006-A): `src/components/scanner/scanner-view.tsx`, `src/components/scanner/camera-unavailable.tsx`, `src/components/records/record-fields.tsx`, `src/components/records/photo-slot.tsx`, `src/components/records/raw-text-box.tsx`
- 생성(006-B): `src/app/scan/_components/scan-flow.tsx`, `scanner-step.tsx`, `confirm-step.tsx`, `photo-step.tsx`, `done-step.tsx`
- 수정: `src/app/scan/page.tsx`, `src/components/navigation/bottom-tab-bar.tsx`(`/scan` 숨김), `src/app/layout.tsx`(Toaster 위치·색상)
- 참고: `docs/PRD.md` §2, §3 F1~F4, §5 스캔, ROADMAP Q4·Q7·Q10

## 수락 기준

- [x] S-스캔-1 카메라 권한 거부: 카메라 영역 대신 "카메라 권한이 필요합니다" 안내 + **직접 입력** 버튼 (F1-3 화면)
- [x] S-스캔-2 카메라 미지원(비-HTTPS 포함): 스캐너 없이 직접 입력 화면이 바로 보임 (F1-4 화면)
- [x] S-스캔-3 QR 분리 실패: 원문 표시 + "자동 인식 실패, 직접 입력해주세요" 안내 + 빈 Product No/Lot 입력 활성화 (F2-3 화면)
- [x] S-스캔-4 사진 디코딩 실패: 해당 슬롯에 "지원하지 않는 이미지 형식입니다. 다시 촬영해주세요" 오류 (F3-3 화면)
- [x] S-스캔-5 업로드(저장) 실패: 에러 토스트 + **다시 시도** 버튼, 입력값 유지
- [x] S-스캔-6 중복: 저장 완료 후 성공 토스트와 "중복 기록이 있습니다" 경고 토스트가 함께 보임 (F4-1 화면, Q4)
- [x] S-스캔-7 사진 미첨부 저장: "사진 없이 저장하시겠습니까?" 확인 모달 (F3-4 화면)
- [x] 스캔 화면에서 하단 탭 바가 숨겨진다 (Q10)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

### 006-A: 공용 컴포넌트

- [x] `scanner-view`: 전체 폭 3:4 카메라 영역(더미는 회색) + 조준 사각형 + "QR을 사각형 안에 맞춰주세요". `children`은 Task 014의 video 자리
- [x] `camera-unavailable`: `reason`(`denied`/`unsupported`)별 안내 + 직접 입력 버튼
- [x] `record-fields`: `useFormContext` 기반 Product No/Lot/메모(글자 수 표시) 입력, `showRawTextInput`이면 "QR 원문(선택)" 입력란(Q7). 필드 이름은 DTO와 같은 snake_case
- [x] `photo-slot`: `state`(`empty`/`preview`/`error`)별 표시, 촬영·재촬영·비우기·다시 촬영 버튼(48px)
- [x] `raw-text-box`: 원문 읽기 전용(길면 스크롤), `[직접입력]`이면 "직접 입력(원문 없음)"

### 006-B: 단계 흐름

- [x] `page.tsx`: `searchParams`를 `await`하고 `readPreview(params.preview, SCAN_PREVIEWS)`를 `ScanFlow`에 전달
- [x] `scan-flow.tsx`: `useReducer`로 단계 상태 관리(`DETECTED`, `MANUAL`, `CONFIRM`, `BACK`, `SET_PHOTO`, `SAVE_START/SUCCESS/FAIL`, `RESET`). 상단에 단계 이름과 1/3·2/3·3/3 표시. `onSave` prop이 없으면 더미 저장(0.8초 지연, 더미 목록과 Product No+Lot이 대소문자까지 같으면 중복, Q9)
- [x] `scanner-step`: 카메라 영역 + 개발 모드 전용 "더미 QR 인식" 버튼 + 직접 입력 버튼. 권한 거부면 `CameraUnavailable`
- [x] `confirm-step`: 원문 박스, 파싱 실패 안내, 카메라 미지원 안내, `RecordFields`, React Hook Form + `zodResolver`로 필드 오류 표시. 직접 입력에서 원문을 비우면 `[직접입력]`으로 저장(Q7)
- [x] `photo-step`: 사진 슬롯 2개, 저장 버튼(저장 중 스피너·비활성화), 정보 수정(이전 단계)
- [x] `done-step`: 저장 결과 요약(Product No, Lot, 사진 장수, 메모) + **다음 스캔**·**홈으로**
- [x] 토스트: "저장되었습니다"(성공), "중복 기록이 있습니다"(경고), "저장에 실패했습니다" + 다시 시도(오류). `Toaster`를 `position="top-center"`, `richColors`로 변경
- [x] `bottom-tab-bar`의 `HIDDEN_PATHS`에 `/scan` 추가

## 테스트 체크리스트

> Playwright MCP, 375x812

- [x] 정상 흐름: `/scan`(탭 바 없음) → 더미 QR 인식 → 2/3, Product No `DK-3001` 자동 입력 → Product No 비우고 다음 → "Product No를 입력해주세요" → 다시 입력 → 3/3 → 사진 2장 촬영 → 저장(버튼 "저장 중..." 비활성화) → 완료 + "저장되었습니다" → 다음 스캔 → 1/3
- [x] 직접 입력: "QR 원문(선택)" 입력란 표시 → `DK-1001`/`L2026-0928A` → 사진 없이 저장 → 확인 모달 → 저장 → "저장되었습니다" + "중복 기록이 있습니다"
- [x] `?preview=denied` 권한 안내 + 직접 입력, `unsupported` 2/3 직접 입력 화면 + 미지원 안내, `parse-fail` 원문 + 실패 안내 + 빈 입력, `photo-error` 바코드 슬롯 오류 문구, `save-error` 오류 토스트 + 다시 시도(3/3 단계와 사진 2장 유지), `duplicate` 성공 + 경고 토스트, `no-photo` 확인 모달
- [x] 7개 상태 가로 스크롤 없음, 홈으로 돌아가면 탭 바 다시 표시, 콘솔 오류 없음

## 확인 필요

- **탭 바 숨김 범위**: Q10의 "스캔 진행 중"을 `/scan` 경로 전체로 해석했다. 스캔 화면에서는 헤더의 뒤로 가기(홈)로 나간다. 사진 단계에서 뒤로 가기를 누르면 입력값이 사라지므로, 이탈 확인이 필요한지 Task 008-1에서 본다.
- **정보 확인 폼 스키마**: `createRecordSchema`를 그대로 쓰고 `raw_text`만 빈 문자열을 허용하도록 `extend`했다(`createRecordSchema.shape.raw_text.or(z.literal(''))`). 원문 길이 제한(2000자)은 유지된다. 빈 원문은 제출 시 `MANUAL_RAW_TEXT`로 바꾼다. 스키마 자체를 바꿀지는 Task 008-1에서 정한다.
- **더미 QR 인식 버튼**: 카메라 없이 흐름을 확인하려고 개발 모드에서만 보여준다(프로덕션에서는 `dummyDetection`을 넘기지 않음). Task 014에서 실제 스캐너로 바꾼다.
- **카메라 미지원 안내 문구**: PRD에는 "직접 입력 화면으로 즉시 전환"만 있어 "이 브라우저에서는 카메라를 사용할 수 없습니다" 안내를 새로 정했다. 권한 거부 설명, 저장 실패 설명 문구도 새로 정했다.
- **토스트 위치**: 하단 저장·다음 버튼을 가리지 않도록 상단 가운데로 옮겼다. 앱 전체에 적용된다.
- Context7 확인: `@hookform/resolvers` v5 + Zod v4에서 입력·출력 타입이 다를 수 있는 스키마는 `useForm<z.input<S>, unknown, z.output<S>>` 제네릭 3개를 명시한다(`confirm-step`에 적용).

## 변경 사항 요약

- 흐름 상태는 `scan-flow` 한 곳의 reducer에 모았다. 단계 컴포넌트는 값과 콜백만 받는다. Phase 4에서는 `onDetected`(Task 014), `onCapture`(Task 015), `onSave`(Task 016)만 바꿔 끼우면 된다.
- `?preview` 값에 따라 해당 상태가 보이는 단계에서 시작하도록 `initState`를 두었다. `duplicate`는 더미 목록에 있는 값(`DK-1001`)으로 채워 실제 중복 판정 경로를 탄다.
- "다음 스캔"은 카메라 상태(거부·미지원)를 유지한 채 처음 단계로 돌아간다.
- 저장에 실패해도 단계·입력값·사진을 그대로 두고, 토스트의 다시 시도나 저장 버튼으로 다시 저장할 수 있다.
