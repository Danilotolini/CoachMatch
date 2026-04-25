import { useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestGym } from '@/api/gyms'
import type { GymSuggestPayload } from '@/types/api'

export function useSuggestGym() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GymSuggestPayload) => suggestGym(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gyms'] })
    },
  })
}
