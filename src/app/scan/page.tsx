import { ScanFlow } from './_components/scan-flow'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
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

  return (
    <>
      <AppHeader title="스캔" backHref="/" />
      <main className="flex-1">
        <Container
          size="mobile"
          className="py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <ScanFlow preview={preview} />
        </Container>
      </main>
    </>
  )
}
