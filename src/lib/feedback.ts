// QR 인식 피드백(진동·효과음) 유틸 (PRD F1-2).
// AudioContext는 브라우저 자동재생 정책 때문에 사용자 제스처 안에서 미리 만들어 둬야 한다.

// 모듈 싱글턴. 탭 지점(홈 스캔 시작, 직접 입력 등)에서 unlockAudio()로 미리 생성·재개한다
let audioContext: AudioContext | null = null

// 사용자 제스처(클릭 등) 핸들러 안에서 호출해 AudioContext를 만들고 resume한다
export function unlockAudio(): void {
  try {
    if (typeof window === 'undefined') return
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }
  } catch {
    // 효과음은 부가 기능이므로 생성 실패는 무시한다
  }
}

// 인식 성공 피드백: 진동 가능 기기는 진동으로 끝내고, 아니면 짧은 비프음을 낸다.
// 모든 실패는 사용자 흐름을 막지 않도록 조용히 무시한다
export function playScanFeedback(): void {
  try {
    if (navigator.vibrate?.(100)) return
  } catch {
    // 진동 API 실패 시 아래 비프음으로 대체한다
  }

  try {
    if (!audioContext) return
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.2
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.12)
  } catch {
    // 비프음도 실패하면 그냥 무시한다
  }
}
