# 테스트 자료 (Playwright MCP·API 테스트용)

ROADMAP 공통 규칙에 따라 Playwright MCP 테스트에서 업로드하는 파일을 이곳에 둡니다. 크기가 큰 파일은 커밋하지 않고, 아래 명령으로 스크래치 폴더에 만들어 씁니다.

| 파일               | 내용                                               | 용도                                                             |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| `barcode-wide.jpg` | 800x267 JPEG (약 3:1, 바코드 라벨 형태)            | 정상 업로드, 가로형 사진 비율 확인                               |
| `product-wide.jpg` | 800x160 JPEG (약 5:1, 제품 사진 형태)              | 정상 업로드, 재촬영 교체                                         |
| `sample.png`       | 400x133 PNG                                        | PNG 업로드 허용 확인 (ROADMAP Q8)                                |
| `broken.jpg`       | JPEG 시작 바이트(`FF D8 FF E0`) 뒤가 깨진 27바이트 | 화면: 디코딩 실패(S-스캔-4). API는 시작 바이트만 검사해 받음(Q8) |
| `not-image.txt`    | 텍스트 파일                                        | 이미지가 아닌 파일 → `415 UNSUPPORTED_MEDIA_TYPE`                |

## 커밋하지 않는 자료 만들기

```bash
# 5MB(PHOTO_MAX_BYTES) 초과 파일 → 413 PAYLOAD_TOO_LARGE 확인용 (JPEG 헤더 + 6MB 채움)
S=<스크래치 폴더>
{ printf '\xff\xd8\xff\xe0'; head -c 6291456 /dev/zero; } > "$S/too-large.jpg"

# HEIC 샘플 (macOS). 브라우저별 디코딩 가능 여부 확인용 (PRD §8)
sips -s format heic tests/fixtures/barcode-wide.jpg --out "$S/sample.heic"
```

## 테스트 서버

실데이터(`data/`)를 건드리지 않도록 스크래치 폴더를 `DATA_DIR`로 지정해 dev 서버를 띄웁니다.

```bash
DATA_DIR=<스크래치>/data TZ=Asia/Seoul npx next dev --turbopack -p 3100
# 테스트 후 정합성 확인
DATA_DIR=<스크래치>/data node --import ./scripts/register-alias.mjs scripts/check-data-integrity.ts
```

## QR 원문 샘플 (Task 021)

실제 라벨 원문을 모아 `qr-samples.json`으로 두면 자동 입력 성공률을 잴 수 있습니다. 형식은 `qr-samples.example.json`(실제 원문이 아닌 예시 4건)을 따릅니다.

| 필드        | 설명                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| `id`        | 샘플 이름 (예: `vendorA-dm-01`)                                          |
| `labelType` | 코드 종류 `datamatrix`·`qr`·`code128`·`ean13`·`code39` (ROADMAP Q14)     |
| `source`    | 거래처·라벨 종류 메모 (선택)                                             |
| `raw`       | 스캔한 원문 그대로. 줄바꿈은 `\n`, GS1 구분 문자(FNC1)는 `\u001d`로 적음 |
| `expected`  | 화면에 자동 입력되어야 하는 `productNo`(표 형식 변환 후)와 `lot`         |

원문을 얻는 방법:

1. 앱에서 라벨을 스캔해 저장한 뒤, 상세 화면의 **QR 원문** 박스 내용이나 `GET /api/records/{id}`의 `raw_text`를 그대로 복사합니다 (저장된 원문은 절대 바뀌지 않습니다, F1-5)
2. 여러 건이면 내보내기 엑셀의 **QR 원문** 열을 복사해도 됩니다
3. 줄바꿈이나 보이지 않는 구분 문자가 있을 수 있으므로, 가능하면 `GET /api/records/{id}` 응답의 JSON 문자열을 그대로 옮깁니다

```bash
node --import ./scripts/register-alias.mjs scripts/check-qr-parser.ts --samples tests/fixtures/qr-samples.json
# 성공률 95% 미만이면 exit 1, 실패한 샘플은 원문·기대·실제·적용 규칙과 함께 출력
```
