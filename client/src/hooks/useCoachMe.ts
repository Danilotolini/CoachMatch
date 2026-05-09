import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCoachMe, submitCoachForReview, updateCoachMe } from '@/api/coaches'
import type { Coach, CoachUpdatePayload } from '@/types/api'
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
    mutationFn: (payload: CoachUpdatePayload) => updateCoachMe(payload),
    onSuccess: (data: Coach) => {
      queryClient.setQueryData(['coachMe'], data)
    },
  })
}

export function useSubmitCoachForReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitCoachForReview,
    onSuccess: (data: Coach) => {
      queryClient.setQueryData(['coachMe'], data)
    },
  })
}
