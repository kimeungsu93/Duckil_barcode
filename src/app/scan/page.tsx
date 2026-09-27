import { ScanFlow } from './_components/scan-flow'
import { readPreview, type PreviewSearchParams } from '@/lib/preview-state'

// 스캔 화면 상태 미리보기 (PRD §5 S-스캔-1~7, 개발 모드 전용)
const SCAN_PREVIEWS = [
  'denied',
  'unsupported',
  'parse-fail',
  'photo-error',
  'save-error',
  'duplicate',
  'no-photo',
] as const

interface ScanPageProps {
  searchParams: Promise<PreviewSearchParams>
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  // Next.js 15: searchParams는 Promise이므로 await 후 사용
  const params = await searchParams
  const preview = readPreview(params.preview, SCAN_PREVIEWS)

  // 헤더의 뒤로 가기에서 이탈 확인이 필요해 헤더까지 ScanFlow가 그린다
  return <ScanFlow preview={preview} />
}
