import { useQuery } from '@tanstack/react-query'
import { fetchGyms } from '@/api/gyms'
import { getToken } from '@/lib/auth'

const FIVE_MINUTES = 5 * 60 * 1000

export function useGyms(search?: string, city?: string) {
  return useQuery({
    queryKey: ['gyms', search, city],
    queryFn: () => fetchGyms({ search, city }),
    enabled: !!getToken(),
    staleTime: FIVE_MINUTES,
  })
}
