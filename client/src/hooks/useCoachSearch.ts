import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchCoaches } from '@/api/coaches'
import { getToken } from '@/lib/auth'
import type { CoachSearchFilters } from '@/types/api'

function compactFilters(filters: CoachSearchFilters): CoachSearchFilters {
  return {
    q: filters.q?.trim() ? filters.q.trim() : undefined,
    specialties: filters.specialties?.filter(Boolean).sort(),
    address: filters.address?.trim() ? filters.address.trim() : undefined,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    availableOn: filters.availableOn,
    sort: filters.sort ?? 'rating',
    page: filters.page ?? 1,
    limit: filters.limit ?? 12,
  }
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [delayMs, value])

  return debounced
}

export function useCoachSearch(filters: CoachSearchFilters) {
  const debouncedQ = useDebouncedValue(filters.q ?? '', 300)
  const normalized = useMemo(
    () => compactFilters({ ...filters, q: debouncedQ }),
    [debouncedQ, filters],
  )

  return useQuery({
    queryKey: ['coach-search', normalized],
    queryFn: () => searchCoaches(normalized),
    enabled: !!getToken(),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}
