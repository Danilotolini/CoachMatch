import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchClientMe, submitClientHealth, submitClientProfile } from '@/api/clients'
import { isTokenExpired } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'
import type { Client, ClientHealthPayload, ClientProfilePayload } from '@/types/api'

export function useClientMe() {
  const token = useSessionStore((state) => state.sessions.client?.token ?? null)

  return useQuery({
    queryKey: ['clientMe'],
    queryFn: fetchClientMe,
    enabled: !!token && !isTokenExpired(token),
    retry: false,
  })
}

export function useSubmitClientHealth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClientHealthPayload) => submitClientHealth(payload),
    onSuccess: (data: Client) => {
      queryClient.setQueryData(['clientMe'], data)
    },
  })
}

export function useSubmitClientProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClientProfilePayload) => submitClientProfile(payload),
    onSuccess: (data: Client) => {
      queryClient.setQueryData(['clientMe'], data)
    },
  })
}
