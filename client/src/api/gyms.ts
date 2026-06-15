import { apiGet, apiPost } from '@/lib/http'
import type {
  Gym,
  GymSuggestPayload,
  GymSuggestResponse,
  Pagination,
  PaginatedResponse,
} from '@/types/api'

export interface GymsParams {
  search?: string | undefined
  city?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

interface RawGym extends Omit<Gym, 'gymId'> {
  id: string
  active?: string | undefined
}

interface RawGymsResponse {
  items: RawGym[]
  nextCursor?: string | null | undefined
}

function isActiveGym(gym: RawGym): boolean {
  return gym.active === 'True'
}

function normalizeGym(gym: RawGym): Gym | null {
  if (!gym.id) return null

  return {
    gymId: gym.id,
    name: gym.name,
    address: gym.address,
    city: gym.city,
    state: gym.state,
    neighborhood: gym.neighborhood,
    coordinates: gym.coordinates,
  }
}

function buildPagination(data: Gym[], params: GymsParams, nextCursor?: string | null): Pagination {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  return {
    page,
    limit,
    total: data.length,
    totalPages: 1,
    hasNext: !!nextCursor,
    hasPrev: page > 1,
  }
}

function normalizeGymsResponse(
  response: RawGymsResponse,
  params: GymsParams,
): PaginatedResponse<Gym> {
  const rawGyms = Array.isArray(response.items) ? response.items : []
  const data = rawGyms
    .filter(isActiveGym)
    .map(normalizeGym)
    .filter((gym) => gym !== null)

  return {
    data,
    pagination: buildPagination(data, params, response.nextCursor),
  }
}

export async function fetchGyms(params: GymsParams = {}): Promise<PaginatedResponse<Gym>> {
  const response = await apiGet<RawGymsResponse>(
    '/coach/gyms',
    {
      ...(params.search ? { search: params.search } : {}),
      ...(params.city ? { city: params.city } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { role: 'coach' },
  )
  return normalizeGymsResponse(response, params)
}

export function suggestGym(payload: GymSuggestPayload) {
  return apiPost<GymSuggestResponse>('/coach/gyms/suggest', payload, { role: 'coach' })
}
