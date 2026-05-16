import { Chip } from '@/components/ui/Chip'
import type { CoachSearchFilters } from '@/types/api'

interface ActiveFiltersBarProps {
  filters: CoachSearchFilters
  onRemove: (key: keyof CoachSearchFilters, value?: string) => void
}

export function ActiveFiltersBar({ filters, onRemove }: ActiveFiltersBarProps) {
  const hasFilters =
    !!filters.q ||
    !!filters.address ||
    !!filters.priceMin ||
    !!filters.priceMax ||
    !!filters.availableOn ||
    (filters.specialties?.length ?? 0) > 0

  if (!hasFilters) return null

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      {filters.q ? <Chip label={`Busca: ${filters.q}`} active onRemove={() => { onRemove('q'); }} /> : null}
      {filters.address ? (
        <Chip label={filters.address} active onRemove={() => { onRemove('address'); }} />
      ) : null}
      {filters.specialties?.map((specialty) => (
        <Chip
          key={specialty}
          label={specialty}
          active
          onRemove={() => { onRemove('specialties', specialty); }}
        />
      ))}
      {filters.priceMin ? (
        <Chip label={`De R$ ${String(filters.priceMin)}`} active onRemove={() => { onRemove('priceMin'); }} />
      ) : null}
      {filters.priceMax ? (
        <Chip label={`Até R$ ${String(filters.priceMax)}`} active onRemove={() => { onRemove('priceMax'); }} />
      ) : null}
      {filters.availableOn ? (
        <Chip label={filters.availableOn} active onRemove={() => { onRemove('availableOn'); }} />
      ) : null}
    </div>
  )
}
