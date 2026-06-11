import { Icon } from '@/components/ui/Icon'

interface RatingPillProps {
  value: string | number
}

export function RatingPill({ value }: RatingPillProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-on-surface/10 text-on-surface font-body text-xs font-semibold">
      <Icon name="star" size={14} filled className="text-tertiary-fixed" />
      {value}
    </span>
  )
}
