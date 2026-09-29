// 카메라(getUserMedia) 사용 가능 여부를 판단한다.
// HTTPS(또는 localhost) 같은 보안 컨텍스트가 아니거나 getUserMedia API가 없으면 false.
// SSR 환경에는 window가 없으므로 항상 false를 반환해 서버·클라이언트 렌더 결과를 맞춘다 (F1-4).
export function isCameraSupported(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
}
