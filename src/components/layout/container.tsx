import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'mobile' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function Container({
  children,
  className,
  size = 'lg',
}: ContainerProps) {
  const sizes = {
    // 휴대폰 세로 화면 기준 단일 컬럼 (최대 480px, 좌우 16px)
    mobile: 'max-w-[480px]',
    sm: 'max-w-3xl sm:px-6 lg:px-8',
    md: 'max-w-5xl sm:px-6 lg:px-8',
    lg: 'max-w-7xl sm:px-6 lg:px-8',
    xl: 'max-w-[1400px] sm:px-6 lg:px-8',
    full: 'max-w-full sm:px-6 lg:px-8',
  }

  return (
    <div className={cn('mx-auto w-full px-4', sizes[size], className)}>
      {children}
    </div>
  )
}
