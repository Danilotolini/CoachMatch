import { apiGet, apiPost } from '@/lib/http'
import type { Client, ClientHealthPayload, ClientProfilePayload } from '@/types/api'

export function fetchClientMe(): Promise<Client> {
  return apiGet<Client>('/clients/me')
}

export function submitClientHealth(payload: ClientHealthPayload): Promise<Client> {
  return apiPost<Client>('/clients/me/health', payload)
}

export function submitClientProfile(payload: ClientProfilePayload): Promise<Client> {
  return apiPost<Client>('/clients/me/profile', payload)
}
