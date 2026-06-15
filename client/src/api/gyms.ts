import { apiGet, apiPost } from '@/lib/http'
import type { Gym, GymSuggestPayload, GymSuggestResponse } from '@/types/api'

export interface GymsParams {
  search?: string | undefined
  city?: string | undefined
  cursor?: string | undefined
  limit?: number | undefined
}

export interface GymsPage {
  data: Gym[]
  nextCursor: string | null
}

interface RawGym extends Omit<Gym, 'gymId'> {
  id: string
  active?: string | undefined
}

interface RawGymSuggestResponse extends Omit<GymSuggestResponse, 'data'> {
  data?: RawGym | Gym | undefined
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

function normalizeSuggestedGym(gym: RawGym | Gym | undefined): Gym | undefined {
  if (!gym) return undefined
  if ('gymId' in gym) return gym
  return normalizeGym(gym) ?? undefined
}

function normalizeGymsResponse(response: RawGymsResponse): GymsPage {
  const rawGyms = Array.isArray(response.items) ? response.items : []
  const data = rawGyms
    .filter(isActiveGym)
    .map(normalizeGym)
    .filter((gym) => gym !== null)

  return {
    data,
    nextCursor: response.nextCursor ?? null,
  }
}

export async function fetchGyms(params: GymsParams = {}): Promise<GymsPage> {
  const response = await apiGet<RawGymsResponse>(
    '/coach/gyms',
    {
      ...(params.search ? { search: params.search } : {}),
      ...(params.city ? { city: params.city } : {}),
      ...(params.cursor ? { cursor: params.cursor } : {}),
      limit: params.limit ?? 5,
    },
    { role: 'coach' },
  )
  return normalizeGymsResponse(response)
}

export function suggestGym(payload: GymSuggestPayload) {
  return apiPost<RawGymSuggestResponse>('/coach/gyms/suggest', payload, { role: 'coach' }).then(
    (response) => ({
      ...response,
      data: normalizeSuggestedGym(response.data),
    }),
  )
}
