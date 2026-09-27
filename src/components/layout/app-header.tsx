import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Container } from './container'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  title: string
  // 지정하면 좌측에 뒤로 가기 버튼을 표시한다 (상세 화면용)
  backHref?: string
  // 이동 전에 확인이 필요할 때 링크 대신 버튼으로 처리한다 (스캔 화면용)
  onBack?: () => void
  // 테마 토글 왼쪽에 넣을 화면별 동작 버튼
  action?: React.ReactNode
}

export function AppHeader({ title, backHref, onBack, action }: AppHeaderProps) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <Container size="mobile">
        <div className="flex h-14 items-center gap-1">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-touch"
              className="-ml-3"
              onClick={onBack}
            >
              <ChevronLeft className="size-6" />
              <span className="sr-only">뒤로 가기</span>
            </Button>
          ) : (
            backHref && (
              <Button
                asChild
                variant="ghost"
                size="icon-touch"
                className="-ml-3"
              >
                <Link href={backHref}>
                  <ChevronLeft className="size-6" />
                  <span className="sr-only">뒤로 가기</span>
                </Link>
              </Button>
            )
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
            {title}
          </h1>
          {action}
          <ThemeToggle />
        </div>
      </Container>
    </header>
  )
}
