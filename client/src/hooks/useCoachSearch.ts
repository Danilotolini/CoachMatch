import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { searchCoaches } from '@/api/coaches'
import { getToken } from '@/lib/auth'
import type { CoachSearchCursor, CoachSearchFilters } from '@/types/api'

function compactFilters(filters: CoachSearchFilters): CoachSearchFilters {
  return {
    q: filters.q?.trim() ? filters.q.trim() : undefined,
    specialties: filters.specialties?.filter(Boolean).sort(),
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

  return useInfiniteQuery({
    queryKey: ['coach-search', normalized],
    queryFn: ({ pageParam }) => searchCoaches({ ...normalized, lastKey: pageParam }),
    initialPageParam: null as CoachSearchCursor | null,
    getNextPageParam: (lastPage) => lastPage.meta.lastKey,
    enabled: !!getToken(),
    staleTime: 30 * 1000,
  })
}
