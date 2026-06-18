import { Chip } from '@/components/ui/Chip'
import type { CoachSearchFilters } from '@/types/api'

interface ActiveFiltersBarProps {
  filters: CoachSearchFilters
  onRemove: (key: keyof CoachSearchFilters, value?: string) => void
}

export function ActiveFiltersBar({ filters, onRemove }: ActiveFiltersBarProps) {
  const hasFilters = !!filters.q || (filters.specialties?.length ?? 0) > 0

  if (!hasFilters) return null

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      {filters.q ? (
        <Chip
          label={`Busca: ${filters.q}`}
          active
          onRemove={() => {
            onRemove('q')
          }}
        />
      ) : null}
      {filters.specialties?.map((specialty) => (
        <Chip
          key={specialty}
          label={specialty}
          active
          onRemove={() => {
            onRemove('specialties', specialty)
          }}
        />
      ))}
    </div>
  )
}
