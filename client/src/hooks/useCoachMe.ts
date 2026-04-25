import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCoachMe, updateCoachMe } from '@/api/coaches'
import type { CoachMePayload } from '@/types/api'
import { getToken } from '@/lib/auth'

export function useCoachMe() {
  return useQuery({
    queryKey: ['coachMe'],
    queryFn: fetchCoachMe,
    enabled: !!getToken(),
    retry: false,
  })
}

export function useUpdateCoachMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CoachMePayload) => updateCoachMe(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['coachMe'], data)
    },
  })
}
