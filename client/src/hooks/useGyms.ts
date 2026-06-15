import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchGyms, suggestGym } from '@/api/gyms'
import { getToken } from '@/lib/auth'
import type { GymSuggestResponse } from '@/types/api'

const FIVE_MINUTES = 5 * 60 * 1000
const FULL_LIST_LIMIT = 500

// Lista completa de academias (lookup de nome por gymId). Sem paginação interativa.
export function useGyms(city?: string) {
  return useQuery({
    queryKey: ['gyms', 'all', city],
    queryFn: () => fetchGyms({ city, limit: FULL_LIST_LIMIT }),
    enabled: !!getToken(),
    staleTime: FIVE_MINUTES,
  })
}

// Busca paginada por cursor (dropdown do onboarding, com "carregar mais").
export function useGymSearch(search?: string) {
  return useInfiniteQuery({
    queryKey: ['gyms', 'search', search],
    queryFn: ({ pageParam }) => fetchGyms({ search, cursor: pageParam }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!getToken() && !!search,
    staleTime: FIVE_MINUTES,
    select: (result) => ({ data: result.pages.flatMap((page) => page.data) }),
  })
}

export interface SuggestGymInput {
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates?: null | undefined
}

export function useSuggestGym() {
  const queryClient = useQueryClient()

  return useMutation<GymSuggestResponse, Error, SuggestGymInput>({
    mutationFn: (input) =>
      suggestGym({
        name: input.name.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.toUpperCase(),
        neighborhood: input.neighborhood.trim(),
        coordinates: null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gyms'] })
    },
  })
}
