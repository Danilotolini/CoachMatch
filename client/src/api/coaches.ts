import { apiGet, apiPut } from '@/lib/http'
import type {
  Coach,
  CoachDetail,
  CoachSearchFilters,
  CoachSearchResponse,
  CoachUpdatePayload,
} from '@/types/api'

export function fetchCoachMe(): Promise<Coach> {
  return apiGet<Coach>('/coach/me', undefined, { role: 'coach' })
}

export function searchCoaches(filters: CoachSearchFilters = {}): Promise<CoachSearchResponse> {
  return apiGet<CoachSearchResponse>(
    '/student/coaches',
    {
      q: filters.q,
      'specialties[]': filters.specialties,
      address: filters.address,
      availableOn: filters.availableOn,
      sort: filters.sort ?? 'rating',
      page: filters.page ?? 1,
      limit: filters.limit ?? 12,
    },
    { role: 'client' },
  )
}

export function fetchCoachDetail(coachId: string): Promise<CoachDetail> {
  return apiGet<CoachDetail>(`/coaches/${coachId}`, undefined, { role: 'client' })
}

export function updateCoachMe(payload: CoachUpdatePayload): Promise<Coach> {
  return apiPut<Coach>('/coach/me', payload, { role: 'coach' })
}
