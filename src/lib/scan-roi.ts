// 스캐너 디코딩 영역(ROI) 계산 - 브라우저 API에 의존하지 않는 순수 함수.
// 화면의 조준 사각형 주변만 잘라 디코딩하면 작은 Data Matrix가 입력에서 차지하는 비율이 커지고
// 배경(검은 비닐 등) 잡음이 줄어 인식률이 오른다.

// 조준 사각형 크기. scanner-view.tsx의 `size-3/5 max-w-64`(가로·세로 60%, 가로 최대 256px)와 맞춘다
export const AIM_RATIO = 0.6
export const AIM_MAX_WIDTH_PX = 256
// 조준 사각형보다 넓게 잘라 코드가 사각형에 살짝 걸쳐도 놓치지 않게 한다
export const ROI_MARGIN_SCALE = 1.4

// 원본 비디오 프레임 안의 사각형 (drawImage의 sx, sy, sw, sh)
export interface SourceRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export function fullFrameRect(
  videoWidth: number,
  videoHeight: number
): SourceRect {
  return { sx: 0, sy: 0, sw: videoWidth, sh: videoHeight }
}

// 화면(컨테이너 CSS px)의 조준 사각형을 원본 비디오 좌표로 환산한다.
// video는 컨테이너를 꽉 채우는 object-cover라, 짧은 쪽이 맞춰지고 긴 쪽은 가운데 기준으로 잘린다
export function aimRoiRect(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): SourceRect {
  if (
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    containerWidth <= 0 ||
    containerHeight <= 0
  ) {
    return fullFrameRect(videoWidth, videoHeight)
  }

  // object-cover 배율: 화면 1px당 원본 픽셀 수의 역수
  const scale = Math.max(
    containerWidth / videoWidth,
    containerHeight / videoHeight
  )

  const aimWidth = Math.min(containerWidth * AIM_RATIO, AIM_MAX_WIDTH_PX)
  const aimHeight = containerHeight * AIM_RATIO

  const sw = Math.min(videoWidth, (aimWidth * ROI_MARGIN_SCALE) / scale)
  const sh = Math.min(videoHeight, (aimHeight * ROI_MARGIN_SCALE) / scale)

  return {
    sx: Math.round((videoWidth - sw) / 2),
    sy: Math.round((videoHeight - sh) / 2),
    sw: Math.round(sw),
    sh: Math.round(sh),
  }
}
