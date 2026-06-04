import { apiGet, apiPost } from '@/lib/http'
import type { Gym, GymSuggestPayload, PaginatedResponse } from '@/types/api'

export interface GymsParams {
  search?: string | undefined
  city?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

interface BackendGym {
  gymId: string
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: { lat: number; lng: number }
}

interface BackendGymsResponse {
  items: BackendGym[]
  nextCursor: string | null
}

export async function fetchGyms(params: GymsParams = {}): Promise<PaginatedResponse<Gym>> {
  const raw = await apiGet<BackendGymsResponse>('/gyms', {
    limit: params.limit ?? 20,
  })
  return {
    data: raw.items.map(({ gymId, ...rest }) => ({ id: gymId, ...rest })),
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    total: raw.items.length,
  }
}

export function suggestGym(payload: GymSuggestPayload) {
  return apiPost<undefined>('/gyms/suggest', payload)
}
