import { apiGet, apiPost } from '@/lib/http'
import type { Gym, GymSuggestPayload, PaginatedResponse } from '@/types/api'

export interface GymsParams {
  search?: string | undefined
  city?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export function fetchGyms(params: GymsParams = {}) {
  return apiGet<PaginatedResponse<Gym>>('/gyms', {
    search: params.search,
    city: params.city,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  })
}

export function suggestGym(payload: GymSuggestPayload) {
  return apiPost<undefined>('/gyms/suggest', payload)
}
