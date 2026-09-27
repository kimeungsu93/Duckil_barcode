import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface RecordSearchProps {
  value: string
  onChange: (value: string) => void
}

export function RecordSearch({ value, onChange }: RecordSearchProps) {
  return (
    <div className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Product No 또는 Lot 검색"
        aria-label="Product No 또는 Lot 검색"
        className="h-12 pl-10 text-base"
      />
    </div>
  )
}
