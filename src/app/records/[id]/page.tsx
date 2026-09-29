import { RecordDetailSkeleton } from './_components/record-detail-skeleton'
import { RecordDetailView } from './_components/record-detail-view'
import { RecordNotFound } from './_components/record-not-found'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { photoUrl } from '@/lib/api/records-client'
import { findMockRecord, mockPhotoUrl } from '@/lib/mock/records'
import { readPreview, type PreviewSearchParams } from '@/lib/preview-state'
import { toRecordDto } from '@/lib/record-mapper'
import { findRecordById } from '@/lib/records-repo'
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

  // ?preview 더미 경로는 그대로 유지한다 (개발 모드 화면 상태 미리보기용)
  if (preview) {
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

  // 실제 경로: id 형식이 올바르고 기록이 존재할 때만 조회한다 (S-상세-2)
  const parsedId = recordIdSchema.safeParse(id)
  const row = parsedId.success ? findRecordById(parsedId.data) : undefined
  if (!row) return <RecordNotFound />
  const record = toRecordDto(row)

  return (
    <>
      <AppHeader title="기록 상세" backHref="/" />
      <main className="flex-1">
        <Container size="mobile" className="py-4">
          <RecordDetailView
            key={record.updated_at}
            record={record}
            photoUrls={{
              barcode: record.barcode_photo
                ? photoUrl(record.barcode_photo)
                : null,
              product: record.product_photo
                ? photoUrl(record.product_photo)
                : null,
            }}
            preview={preview}
          />
        </Container>
      </main>
    </>
  )
}
