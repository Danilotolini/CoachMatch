import { Icon } from '@/components/ui/Icon'

interface CrefBadgeProps {
  cref?: string | null
}

export function CrefBadge({ cref }: CrefBadgeProps) {
  const value = cref?.replace(/^\s*CREF\s*/i, '').trim()
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-[0.06em]">
      <Icon name="verified" size={12} filled />
      {value ? `CREF ${value}` : 'CREF'}
    </span>
  )
}
