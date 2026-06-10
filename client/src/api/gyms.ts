import { apiGet, apiPost } from '@/lib/http'
import type { Gym, GymSuggestPayload, GymSuggestResponse, PaginatedResponse } from '@/types/api'

export interface GymsParams {
  search?: string | undefined
  city?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export function fetchGyms(params: GymsParams = {}): Promise<PaginatedResponse<Gym>> {
  return apiGet<PaginatedResponse<Gym>>('/gyms', {
    ...(params.search ? { search: params.search } : {}),
    ...(params.city ? { city: params.city } : {}),
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  })
}

export function suggestGym(payload: GymSuggestPayload) {
  return apiPost<GymSuggestResponse>('/gyms/suggest', payload)
}
