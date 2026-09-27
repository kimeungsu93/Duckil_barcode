import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ImageOff } from 'lucide-react'
import { formatKstDisplay } from '@/lib/time'
import type { RecordDto } from '@/lib/types/record'

interface RecordListItemProps {
  record: RecordDto
  thumbnailUrl: string | null
}

export function RecordListItem({ record, thumbnailUrl }: RecordListItemProps) {
  return (
    <Link
      href={`/records/${record.id}`}
      className="hover:bg-accent/50 -mx-2 flex min-h-[72px] items-center gap-3 rounded-md px-2 py-3 transition-colors"
    >
      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
        {thumbnailUrl ? (
          // 사진 경로가 더미(/mock)·API(/api/photos)·blob으로 바뀌므로 최적화를 끈다
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="64px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            <ImageOff className="size-6" aria-hidden />
            <span className="sr-only">사진 없음</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">{record.product_no}</p>
        <p className="text-muted-foreground truncate text-sm">
          Lot {record.lot}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatKstDisplay(record.created_at)}
        </p>
      </div>
      <ChevronRight
        className="text-muted-foreground size-5 shrink-0"
        aria-hidden
      />
    </Link>
  )
}
