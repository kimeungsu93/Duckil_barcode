'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileSpreadsheet, Home, ScanLine, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabItem {
  href: string
  label: string
  icon: LucideIcon
}

const TABS: TabItem[] = [
  { href: '/', label: '홈', icon: Home },
  { href: '/scan', label: '스캔', icon: ScanLine },
  { href: '/export', label: '내보내기', icon: FileSpreadsheet },
]

// 탭 바를 숨기는 경로. 스캔 중에는 카메라·입력 영역을 넓게 쓴다 (ROADMAP Q10)
const HIDDEN_PATHS = ['/scan']

// 홈 탭은 기록 상세(/records/...)에서도 강조한다
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/records')
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomTabBar() {
  const pathname = usePathname()

  if (HIDDEN_PATHS.some(path => isActive(pathname, path))) return null

  return (
    <>
      {/* 고정 탭 바에 본문 끝이 가려지지 않도록 같은 높이의 여백을 둔다 */}
      <div
        aria-hidden
        className="h-[calc(var(--tab-bar-h)+env(safe-area-inset-bottom))]"
      />
      <nav
        aria-label="주요 메뉴"
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid h-[var(--tab-bar-h)] max-w-[480px] grid-cols-3">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-full min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('size-6', active && 'stroke-[2.5]')}
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
