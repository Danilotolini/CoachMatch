import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ActiveFiltersBar } from '@/components/search/ActiveFiltersBar'
import { FilterSheet } from '@/components/search/FilterSheet'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'
import { SearchHeader } from '@/components/search/SearchHeader'
import { SearchResultsList, SearchResultsSkeleton } from '@/components/search/SearchResultsList'
import { SortControl } from '@/components/search/SortControl'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import { useCoachSearch } from '@/hooks/useCoachSearch'
import { logout } from '@/lib/cognito'
import type { CoachSearchFilters, CoachSearchSort } from '@/types/api'

const DEFAULT_LIMIT = 9

function numberParam(searchParams: URLSearchParams, key: string): number | undefined {
  const raw = searchParams.get(key)
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function arrayParam(searchParams: URLSearchParams, key: string): string[] | undefined {
  const values = [...searchParams.getAll(key), ...searchParams.getAll(`${key}[]`)]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  return values.length > 0 ? values : undefined
}

function filtersFromParams(searchParams: URLSearchParams): CoachSearchFilters {
  return {
    q: searchParams.get('q') ?? undefined,
    specialties: arrayParam(searchParams, 'specialties'),
    address: searchParams.get('address') ?? undefined,
    priceMin: numberParam(searchParams, 'priceMin'),
    priceMax: numberParam(searchParams, 'priceMax'),
    availableOn: searchParams.get('availableOn') ?? undefined,
    sort: (searchParams.get('sort') as CoachSearchSort | null) ?? 'rating',
    page: numberParam(searchParams, 'page') ?? 1,
    limit: DEFAULT_LIMIT,
  }
}

function paramsFromFilters(filters: CoachSearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  filters.specialties?.forEach((specialty) => { params.append('specialties', specialty); })
  if (filters.address) params.set('address', filters.address)
  if (filters.priceMin) params.set('priceMin', String(filters.priceMin))
  if (filters.priceMax) params.set('priceMax', String(filters.priceMax))
  if (filters.availableOn) params.set('availableOn', filters.availableOn)
  if (filters.sort && filters.sort !== 'rating') params.set('sort', filters.sort)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  return params
}

export default function ClientSearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])
  const { data, isLoading, isFetching, isError, refetch } = useCoachSearch(filters)
  const coaches = data?.data ?? []
  const pagination = data?.pagination

  function updateFilters(next: CoachSearchFilters) {
    setSearchParams(paramsFromFilters({ ...filters, ...next, page: next.page ?? 1 }))
  }

  function removeFilter(key: keyof CoachSearchFilters, value?: string) {
    if (key === 'specialties') {
      updateFilters({ specialties: filters.specialties?.filter((item) => item !== value) })
      return
    }
    updateFilters({ [key]: undefined })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
    setFiltersOpen(false)
  }

  function handleLogout() {
    logout('client', '/')
  }

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center gap-3 px-4 py-4 sm:px-6 md:px-10 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => {
              void navigate('/client')
            }}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" size={22} />
          </button>
          <div className="min-w-0">
            <span className="font-label text-xs text-on-surface-variant">Explorar treinadores</span>
            <h1 className="truncate font-headline text-2xl font-bold tracking-tight lg:text-3xl">
              Buscar treinador
            </h1>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pb-12 sm:px-6 md:px-10">
          <SearchHeader
            type="search"
            value={filters.q ?? ''}
            onChange={(q) => { updateFilters({ q: q || undefined }); }}
            onOpenFilters={() => { setFiltersOpen(true); }}
          />
          <SortControl value={filters.sort ?? 'rating'} onChange={(sort) => { updateFilters({ sort }); }} />
          <ActiveFiltersBar filters={filters} onRemove={removeFilter} />

          <div className="flex items-center justify-between gap-4">
            <p className="font-body text-sm text-on-surface-variant">
              {pagination ? `${String(pagination.total)} treinadores encontrados` : 'Buscando treinadores'}
            </p>
            {isFetching && !isLoading ? (
              <span className="font-label text-xs text-primary">Atualizando...</span>
            ) : null}
          </div>

          {isLoading ? <SearchResultsSkeleton /> : null}

          {isError ? (
            <Card className="p-6 text-center">
              <Icon name="error" size={34} className="mx-auto mb-3 text-primary" />
              <h2 className="font-headline text-xl font-semibold">Não foi possível carregar a busca</h2>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Tente de novo em alguns instantes.
              </p>
              <Button type="button" onClick={() => void refetch()} className="mt-5">
                TENTAR DE NOVO
              </Button>
            </Card>
          ) : null}

          {!isLoading && !isError && coaches.length === 0 ? (
            <SearchEmptyState onClear={clearFilters} />
          ) : null}

          {!isLoading && !isError && coaches.length > 0 ? <SearchResultsList coaches={coaches} /> : null}

          {!isLoading && !isError && pagination?.hasNext ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => { updateFilters({ page: (filters.page ?? 1) + 1 }); }}
              className="mx-auto w-full max-w-xs"
            >
              VER MAIS
            </Button>
          ) : !isLoading && !isError && coaches.length > 0 ? (
            <p className="py-2 text-center font-label text-xs text-on-surface-variant">Fim dos resultados</p>
          ) : null}
        </section>
      </div>

      <FilterSheet
        open={filtersOpen}
        filters={filters}
        onClose={() => { setFiltersOpen(false); }}
        onApply={(nextFilters) => {
          updateFilters(nextFilters)
          setFiltersOpen(false)
        }}
        onClear={clearFilters}
      />
      <ClientBottomNav />
    </main>
  )
}
