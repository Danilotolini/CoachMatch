import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useGymSearch } from '@/hooks/useGyms'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { GymSuggestForm } from './GymSuggestForm'
import type { Gym } from '@/types/api'

export interface GymOption {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string
}

interface GymPickerProps {
  selectedGyms: GymOption[]
  onAdd: (gym: Gym) => void
  onRemove: (gymId: string) => void
  error?: string | undefined
}

export function GymPicker({ selectedGyms, onAdd, onRemove, error }: GymPickerProps) {
  const [search, setSearch] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)

  const {
    data: gymsData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGymSearch(search)

  const { rootRef, sentinelRef } = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => void fetchNextPage(),
  })

  const options = (gymsData?.data ?? []).filter(
    (gym) => !selectedGyms.some((selected) => selected.id === gym.gymId),
  )

  const handleAdd = (gym: Gym) => {
    onAdd(gym)
    setSearch('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-highest rounded-t-lg border-b border-surface-variant focus-within:border-primary transition-colors p-3 flex items-center">
        <Icon name="location_on" className="mr-3 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Buscar por nome da academia ou bairro..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
          className="bg-transparent border-none w-full text-on-surface font-body text-sm focus:ring-0 focus:outline-none p-0 placeholder-on-surface-variant/50"
        />
      </div>

      {search ? (
        isLoading ? (
          <p className="px-1 font-body text-xs text-on-surface-variant">Buscando academias...</p>
        ) : options.length > 0 ? (
          <div ref={rootRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {options.map((gym) => (
              <button
                key={gym.gymId}
                type="button"
                onClick={() => {
                  handleAdd(gym)
                }}
                className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
              >
                <span className="block font-body text-sm text-on-surface">{gym.name}</span>
                <span className="block font-body text-xs text-on-surface-variant">
                  {gym.neighborhood}, {gym.city} - {gym.state}
                </span>
              </button>
            ))}
            {hasNextPage ? (
              <div
                ref={sentinelRef}
                className="py-2 text-center font-body text-xs text-on-surface-variant"
              >
                {isFetchingNextPage ? 'Carregando...' : 'Role para ver mais'}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg bg-surface-container-low px-4 py-3 text-center">
            <p className="font-body text-sm text-on-surface">Nenhuma academia encontrada</p>
            <p className="mt-1 font-body text-xs text-on-surface-variant">
              Revise o nome ou sugira uma nova academia abaixo.
            </p>
          </div>
        )
      ) : null}

      {selectedGyms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedGyms.map((gym) => (
            <div
              key={gym.id}
              className="inline-flex items-center bg-surface-container-low border border-outline-variant/30 rounded-lg py-2 px-3 gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-body text-xs text-on-surface">{gym.name}</span>
              <button
                type="button"
                onClick={() => {
                  onRemove(gym.id)
                }}
                aria-label={`Remover ${gym.name}`}
                className="text-on-surface-variant hover:text-error transition-colors ml-2"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {showSuggest ? (
        <GymSuggestForm
          onCancel={() => {
            setShowSuggest(false)
          }}
          onSuggested={(gym) => {
            handleAdd(gym)
            setShowSuggest(false)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowSuggest(true)
          }}
          className="text-primary text-xs font-bold uppercase tracking-widest hover:underline"
        >
          SUGERIR ACADEMIA
        </button>
      )}

      {error ? <p className="font-body text-xs text-error">{error}</p> : null}
    </div>
  )
}
