import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { useStudentSpecialties } from '@/hooks/useStudentSpecialties'
import type { CoachSearchFilters } from '@/types/api'

interface FilterSheetProps {
  open: boolean
  filters: CoachSearchFilters
  onClose: () => void
  onApply: (filters: CoachSearchFilters) => void
  onClear: () => void
}

function toggleItem(items: string[], item: string): string[] {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item]
}

export function FilterSheet({ open, filters, onClose, onApply, onClear }: FilterSheetProps) {
  if (!open) return null

  return (
    <FilterSheetContent
      key={JSON.stringify(filters)}
      filters={filters}
      onClose={onClose}
      onApply={onApply}
      onClear={onClear}
    />
  )
}

function FilterSheetContent({
  filters,
  onClose,
  onApply,
  onClear,
}: Omit<FilterSheetProps, 'open'>) {
  const [draft, setDraft] = useState(filters)
  const { data: specialtiesData } = useStudentSpecialties()
  const specialties = specialtiesData?.data ?? []

  const selectedSpecialties = draft.specialties ?? []

  function updateDraft(next: Partial<CoachSearchFilters>) {
    setDraft((current) => ({ ...current, ...next }))
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar filtros"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm lg:bg-black/35"
      />
      <aside className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-outline-variant/10 bg-surface-container-low p-5 shadow-2xl lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-105 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-xl font-semibold">Filtros</h2>
            <p className="font-body text-sm text-on-surface-variant">
              Refine sua busca por treinador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            aria-label="Fechar"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="space-y-7">
          <section className="space-y-3">
            <h3 className="font-label text-xs font-bold uppercase text-on-surface-variant">
              Modalidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {specialties.map((specialty) => (
                <Chip
                  key={specialty.id}
                  label={specialty.label}
                  active={selectedSpecialties.includes(specialty.label)}
                  onClick={() => {
                    updateDraft({ specialties: toggleItem(selectedSpecialties, specialty.label) })
                  }}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 -mx-5 mt-8 flex gap-3 border-t border-outline-variant/10 bg-surface-container-low px-5 pt-4 pb-safe lg:-mx-6 lg:px-6">
          <Button type="button" variant="secondary" onClick={onClear} className="flex-1">
            LIMPAR FILTROS
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft)
            }}
            className="flex-1"
          >
            APLICAR
          </Button>
        </div>
      </aside>
    </div>
  )
}
