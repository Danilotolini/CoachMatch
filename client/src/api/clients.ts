import { apiGet, apiPost } from '@/lib/http'
import type { Client, ClientHealthPayload, ClientProfilePayload } from '@/types/api'

export function fetchClientMe(): Promise<Client> {
  return apiGet<Client>('/student/me', undefined, { role: 'client' })
}

export function submitClientHealth(payload: ClientHealthPayload): Promise<Client> {
  return apiPost<Client>('/student/me/health', payload, { role: 'client' })
}

export function submitClientProfile(payload: ClientProfilePayload): Promise<Client> {
  return apiPost<Client>('/student/me/profile', payload, { role: 'client' })
}
