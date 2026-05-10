import { Icon } from '@/components/ui/Icon'

export function CrefBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-on-primary font-label text-[10px] font-bold uppercase tracking-[0.06em]">
      <Icon name="verified" size={12} filled />
      CREF
    </span>
  )
}
