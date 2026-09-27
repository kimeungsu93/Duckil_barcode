import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'
import { AppHeader } from '@/components/layout/app-header'
import { Container } from '@/components/layout/container'
import { EmptyState } from '@/components/states/empty-state'
import { Button } from '@/components/ui/button'

// 존재하지 않는 id (PRD §5 S-상세-2)
export function RecordNotFound() {
  return (
    <>
      <AppHeader title="기록 상세" backHref="/" />
      <main className="flex-1">
        <Container size="mobile" className="py-4">
          <EmptyState
            icon={FileQuestion}
            title="기록을 찾을 수 없습니다"
            description="삭제되었거나 잘못된 주소입니다"
            action={
              <Button asChild size="touch" className="w-full">
                <Link href="/">
                  <Home />
                  홈으로 이동
                </Link>
              </Button>
            }
          />
        </Container>
      </main>
    </>
  )
}
