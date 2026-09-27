import { HomeView } from '@/app/_components/home-view'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { readPreview, type PreviewSearchParams } from '@/lib/preview-state'

// 홈 화면 상태 미리보기 (PRD §5 S-홈-1~4, 개발 모드 전용)
const HOME_PREVIEWS = ['loading', 'empty', 'no-result', 'error'] as const

interface HomePageProps {
  searchParams: Promise<PreviewSearchParams>
}

export default async function Home({ searchParams }: HomePageProps) {
  // Next.js 15: searchParams는 Promise이므로 await 후 사용
  const params = await searchParams
  const preview = readPreview(params.preview, HOME_PREVIEWS)
  const q = typeof params.q === 'string' ? params.q : ''

  return (
    <>
      <AppHeader title="기록 목록" />
      <main className="flex-1">
        <Container size="mobile" className="py-4">
          <HomeView preview={preview} initialQuery={q} />
        </Container>
      </main>
    </>
  )
}
