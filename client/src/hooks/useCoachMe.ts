import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCoachMe, updateCoachMe } from '@/api/coaches'
import type { Coach, CoachUpdatePayload } from '@/types/api'
import { isTokenExpired } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'

export function useCoachMe() {
  const token = useSessionStore((state) => state.sessions.coach?.token ?? null)

  return useQuery({
    queryKey: ['coachMe'],
    queryFn: fetchCoachMe,
    enabled: !!token && !isTokenExpired(token),
    retry: false,
  })
}

export function useUpdateCoachMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CoachUpdatePayload) => updateCoachMe(payload),
    onSuccess: (data: Coach) => {
      queryClient.setQueryData(['coachMe'], data)
    },
  })
}
