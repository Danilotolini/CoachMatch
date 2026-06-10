import { apiGet, apiPost, apiPut } from '@/lib/http'
import type {
  Coach,
  CoachSearchFilters,
  CoachSearchResponse,
  CoachUpdatePayload,
} from '@/types/api'

export function fetchCoachMe(): Promise<Coach> {
  return apiGet<Coach>('/coaches/me')
}

export function searchCoaches(filters: CoachSearchFilters = {}): Promise<CoachSearchResponse> {
  return apiGet<CoachSearchResponse>('/coaches', {
    q: filters.q,
    'specialties[]': filters.specialties,
    address: filters.address,
    availableOn: filters.availableOn,
    sort: filters.sort ?? 'rating',
    page: filters.page ?? 1,
    limit: filters.limit ?? 12,
  })
}

export function updateCoachMe(payload: CoachUpdatePayload): Promise<Coach> {
  return apiPut<Coach>('/coaches/me', payload)
}

export function submitCoachForReview(): Promise<Coach> {
  return apiPost<Coach>('/coaches/me/submit-for-review', {})
}
