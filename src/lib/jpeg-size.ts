// JPEG SOF(Start Of Frame) 헤더에서 가로·세로 픽셀 크기를 읽는 순수 함수 모듈.
// 파일시스템·네트워크에 접근하지 않으므로 'server-only'가 아니다 (검증 스크립트에서 Node로 직접 실행 가능).
//
// 전제(PRD §8): 저장된 JPEG는 Task 015에서 EXIF 회전을 픽셀에 반영한 정방향으로 저장되므로,
// 여기서 읽는 SOF 크기를 그대로 화면에 보이는 가로·세로로 신뢰한다(별도 EXIF Orientation 보정 없음).

export interface JpegSize {
  width: number
  height: number
}

// JPEG 버퍼에서 가로·세로 픽셀 크기를 읽는다.
// SOI(FFD8)로 시작하지 않거나, SOF0/SOF1/SOF2 마커를 찾기 전에 버퍼가 끝나거나
// SOS(스캔 데이터 시작) 마커에 도달하면 null을 반환한다. 예외는 던지지 않는다.
export function readJpegSize(buf: Buffer): JpegSize | null {
  // SOI(Start Of Image, FF D8) 확인
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null

  let offset = 2
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) return null // 마커가 아니면 구조가 손상된 것으로 본다

    // 마커 코드 앞의 0xFF 채움 바이트(패딩)를 건너뛰고 실제 마커 코드 위치를 찾는다
    let markerCodeOffset = offset + 1
    while (markerCodeOffset < buf.length && buf[markerCodeOffset] === 0xff) {
      markerCodeOffset++
    }
    if (markerCodeOffset >= buf.length) return null

    const marker = buf[markerCodeOffset]
    // offset을 이 마커의 실질적인 FF 시작 위치로 재정렬(패딩이 있었다면 한 칸 당겨진다)
    offset = markerCodeOffset - 1

    // 길이 필드가 없는 마커: TEM(01), RST0~RST7(D0~D7) → 마커 2바이트만 건너뛴다
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }

    // EOI(D9) 또는 SOS(DA, 스캔 데이터 시작)에 도달하면 이후 SOF를 찾을 수 없다
    if (marker === 0xd9 || marker === 0xda) return null

    // 이 지점부터는 길이 필드(2바이트, 빅엔디안)를 가진 마커
    if (offset + 3 >= buf.length) return null
    const length = buf.readUInt16BE(offset + 2)

    // SOF0/SOF1/SOF2: 마커(2) + 길이(2) + 정밀도(1) + height(2) + width(2), 빅엔디안
    // C4(DHT)·C8(JPG, 예약)·CC(DAC)는 SOF가 아니므로 제외한다
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (offset + 8 >= buf.length) return null
      const height = buf.readUInt16BE(offset + 5)
      const width = buf.readUInt16BE(offset + 7)
      return { width, height }
    }

    // SOF가 아닌 세그먼트는 길이만큼 건너뛰고 다음 마커로 이동한다
    offset += 2 + length
  }

  return null
}
