import { useQuery } from '@tanstack/react-query'
import { fetchSpecialties } from '@/api/specialties'
import { getToken } from '@/lib/auth'

const ONE_HOUR = 60 * 60 * 1000

export function useSpecialties(search?: string) {
  return useQuery({
    queryKey: ['specialties', search],
    queryFn: () => fetchSpecialties({ search }),
    enabled: !!getToken(),
    staleTime: ONE_HOUR,
  })
}
