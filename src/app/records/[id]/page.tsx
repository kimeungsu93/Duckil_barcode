import { RecordDetailSkeleton } from './_components/record-detail-skeleton'
import { RecordDetailView } from './_components/record-detail-view'
import { RecordNotFound } from './_components/record-not-found'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { findMockRecord, mockPhotoUrl } from '@/lib/mock/records'
import { readPreview, type PreviewSearchParams } from '@/lib/preview-state'
import { recordIdSchema } from '@/lib/schemas/record'

// 상세 화면 상태 미리보기 (PRD §5 S-상세-1·4, 개발 모드 전용)
const DETAIL_PREVIEWS = ['loading', 'save-error'] as const

interface RecordDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<PreviewSearchParams>
}

export default async function RecordDetailPage({
  params,
  searchParams,
}: RecordDetailPageProps) {
  // Next.js 15: params·searchParams는 Promise이므로 await 후 사용
  const { id } = await params
  const preview = readPreview((await searchParams).preview, DETAIL_PREVIEWS)

  if (preview === 'loading') return <RecordDetailSkeleton />

  // Phase 2는 더미 데이터에서 찾는다. Task 018에서 GET /api/records/[id]로 교체
  const parsedId = recordIdSchema.safeParse(id)
  const record = parsedId.success ? findMockRecord(parsedId.data) : undefined
  if (!record) return <RecordNotFound />

  return (
    <>
      <AppHeader title="기록 상세" backHref="/" />
      <main className="flex-1">
        <Container size="mobile" className="py-4">
          <RecordDetailView
            record={record}
            photoUrls={{
              barcode: mockPhotoUrl(record.barcode_photo, 'barcode'),
              product: mockPhotoUrl(record.product_photo, 'product'),
            }}
            preview={preview}
          />
        </Container>
      </main>
    </>
  )
}
