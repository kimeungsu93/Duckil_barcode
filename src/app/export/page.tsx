import { ExportForm } from './_components/export-form'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { readPreview, type PreviewSearchParams } from '@/lib/preview-state'

// 내보내기 화면 상태 미리보기 (PRD §5 S-내보내기-2~6, 개발 모드 전용)
const EXPORT_PREVIEWS = [
  'generating',
  'empty',
  'warn',
  'over-limit',
  'error',
] as const

interface ExportPageProps {
  searchParams: Promise<PreviewSearchParams>
}

export default async function ExportPage({ searchParams }: ExportPageProps) {
  // Next.js 15: searchParams는 Promise이므로 await 후 사용
  const params = await searchParams
  const preview = readPreview(params.preview, EXPORT_PREVIEWS)

  return (
    <>
      <AppHeader title="내보내기" />
      <main className="flex-1">
        <Container size="mobile" className="py-4">
          <ExportForm preview={preview} />
        </Container>
      </main>
    </>
  )
}
