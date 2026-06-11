import { CoachCard } from '@/components/coach/CoachCard'
import type { CoachListItem } from '@/types/api'

interface SearchResultsListProps {
  coaches: CoachListItem[]
}

export function SearchResultsList({ coaches }: SearchResultsListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {coaches.map((coach) => (
        <CoachCard
          key={coach.coachId}
          name={coach.name}
          specialties={coach.specialties.join(' · ')}
          rating={coach.rating.toFixed(1)}
          price={coach.priceFrom}
          {...(coach.photo ? { image: coach.photo } : {})}
          location={`${coach.neighborhood}, ${coach.city}`}
          availability={coach.nextAvailability}
        />
      ))}
    </div>
  )
}

export function SearchResultsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Carregando resultados"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-73 animate-pulse overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low"
        >
          <div className="h-40 bg-surface-container" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-2/3 rounded bg-surface-container-high" />
            <div className="h-3 w-full rounded bg-surface-container-high" />
            <div className="h-5 w-1/3 rounded bg-surface-container-high" />
          </div>
        </div>
      ))}
    </div>
  )
}
