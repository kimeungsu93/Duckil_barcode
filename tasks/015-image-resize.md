# Task 015: 사진 리사이즈 로직 구현 및 사진 슬롯 연결

> ROADMAP: `docs/ROADMAP.md` Phase 4 · Task 015
> 의존: Task 006
> 상태: 완료

## 개요

클라이언트에서 사진을 긴 변 1600px 이하로 축소하고 JPEG(품질 0.8)로 재인코딩하는 `src/lib/image-resize.ts`와, 사진 슬롯 1개의 선택·리사이즈·미리보기 상태를 관리하는 `src/components/records/use-photo-capture.ts`를 구현했다. `createImageBitmap(file, { imageOrientation: 'from-image' })`로 EXIF 회전을 픽셀에 반영해 항상 정방향 JPEG를 만든다. 4000x3000 JPEG·PNG, EXIF Orientation=6 JPEG, 손상 파일로 Playwright MCP 검증을 마쳤다.

## 관련 파일

- 생성: `src/lib/image-resize.ts`, `src/components/records/use-photo-capture.ts`
- 수정: `src/components/records/photo-slot.tsx`(`onFileSelected`, `busy` prop 추가)
- 참고: `docs/PRD.md` §3 F3, §8 / `docs/ROADMAP.md` Q5

## 수락 기준

- [x] 사진을 고르면 바로 미리보기가 보인다 (F3-1)
- [x] 4000x3000 JPEG와 PNG 모두 결과가 `image/jpeg`이고 긴 변이 1600px 이하다 (F3-2)
- [x] 디코딩할 수 없는 파일을 고르면 오류 문구가 보이고 슬롯이 비어 있다 (F3-3, S-스캔-4)
- [x] 세로로 찍어 EXIF 회전 정보가 있는 사진도 결과 JPEG의 가로·세로가 화면에 보이는 방향과 같다 (Task 012 SOF 크기의 전제)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과

## 구현 단계

- [x] 1단계: `image-resize.ts` — `createImageBitmap(file, { imageOrientation: 'from-image' })` 1순위, `HTMLImageElement`(`img.decode()`) 2순위 대체 경로
- [x] 2단계: `<canvas>`에 긴 변 `RESIZE_MAX_EDGE`(1600) 이하로 그리고 `canvas.toBlob('image/jpeg', RESIZE_JPEG_QUALITY)`로 인코딩, 결과 `File`은 항상 `image/jpeg`
- [x] 3단계: 두 디코딩 경로 모두 실패하면 `ImageDecodeError`를 던짐(예외 없이 실패를 알리는 전용 에러)
- [x] 4단계: `use-photo-capture.ts` — `select`/`clear`/`setError`/`reset` API, 재촬영 시 이전 objectURL을 `revokeObjectURL`하고 슬롯당 1장 유지, 연속 선택 시 요청 순번(`requestIdRef`)으로 경쟁 상태 방지
- [x] 5단계: 개발 모드에서 `console.debug('[resize]', ...)`로 원본/결과 크기·해상도 로그
- [x] 6단계: `photo-slot.tsx`에 숨김 `<input type="file" accept="image/*" capture="environment">` 추가, `onFileSelected` 지정 시 촬영 버튼이 파일 입력을 클릭
- [x] 7단계: Playwright MCP로 큰 JPEG/PNG, 손상 파일, 같은 슬롯 재업로드, EXIF 회전 사진 확인

## 테스트 체크리스트

> Playwright MCP. 스크래치 `DATA_DIR`·dev 서버(포트 3113), 375x812. 테스트 자료는 스크래치 폴더에서 `sips`와 임시 Node 스크립트로 생성(신규 의존성 없음).

| 항목                                                           | 기대                                                    | 실제                                                                                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4000x3000 JPEG 업로드                                          | 미리보기 표시, 결과 `image/jpeg`, 긴 변 ≤1600           | ✅ 콘솔 `[resize] 원본 image/jpeg 244876B 4000x3000 → 결과 19559B 1600x1200`, `browser_evaluate`로 blob 재확인 시 `type: image/jpeg`, `1600x1200`              |
| 4000x3000 PNG 업로드                                           | 미리보기 표시, 결과 `image/jpeg`, 긴 변 ≤1600           | ✅ 콘솔 `[resize] 원본 image/png 217503B 4000x3000 → 결과 124066B 1600x1200`, blob 재확인 `type: image/jpeg`, `1600x1200`                                      |
| 손상 이미지(`.jpg` 확장자에 임의 바이트) 업로드                | 오류 문구, 슬롯 비어 있음                               | ✅ "지원하지 않는 이미지 형식입니다. 다시 촬영해주세요" 표시, 슬롯이 빈 상태(파일 없음)로 유지                                                                 |
| 같은 슬롯에 두 번 업로드(손상 파일 후 정상 파일, 또 정상 파일) | 미리보기 1장만 유지                                     | ✅ 매 업로드마다 이전 objectURL이 교체되고 `document.querySelectorAll('img[alt="바코드 사진 미리보기"]').length === 1` 확인                                    |
| EXIF Orientation=6(가로가 긴 원본을 90도 회전) JPEG 업로드     | 미리보기가 세로로 표시, 저장 파일도 세로 방향(SOF 크기) | ✅ 미리보기 blob `1200x1600`(세로). 저장 후 `data/uploads/{file}.jpg`를 `readJpegSize`로 읽어 `{ width: 1200, height: 1600 }` 확인 — 화면에 보이는 방향과 일치 |

## 확인 필요

- Q5: 재촬영은 슬롯당 1장을 유지하는 것으로 확인. 서버 측 "새 파일 먼저 저장 → DB 갱신 성공 후 기존 파일 삭제" 순서는 Task 011에서 이미 구현·검증됨

## 변경 사항 요약

- `src/lib/image-resize.ts`(신규): `resizeImage(file): Promise<File>`, `ImageDecodeError`. `createImageBitmap`(EXIF 반영) → `HTMLImageElement` 대체 → 실패 시 에러
- `src/components/records/use-photo-capture.ts`(신규): `usePhotoCapture()` 훅 — `slot`, `file`, `busy`, `select`, `clear`, `setError`, `reset`
- `src/components/records/photo-slot.tsx`: `onFileSelected?: (file: File) => void`, `busy?: boolean` prop 추가(기존 `onCapture`만 쓰는 상세 화면과 호환 유지)
- 버그 수정 없음: EXIF 회전·크기 제한·오류 처리 모두 설계대로 동작해 체크리스트에서 코드를 수정하지 않았다
