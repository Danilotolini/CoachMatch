import { useQuery } from '@tanstack/react-query'
import { fetchCoachDetail } from '@/api/coaches'
import { getToken } from '@/lib/auth'

export function useCoachDetail(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-detail', coachId],
    queryFn: () => fetchCoachDetail(coachId ?? ''),
    enabled: !!coachId && !!getToken(),
    staleTime: 60 * 1000,
  })
}
