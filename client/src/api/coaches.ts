import { apiGet, apiPut } from '@/lib/http'
import type {
  Coach,
  CoachDetail,
  CoachSearchFilters,
  CoachSearchResponse,
  CoachStudentDetail,
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
      limit: filters.limit ?? 12,
      lastKey: filters.lastKey ? JSON.stringify(filters.lastKey) : undefined,
    },
    { role: 'client' },
  )
}

export function fetchCoachDetail(coachId: string): Promise<CoachDetail> {
  return apiGet<CoachDetail>(`/student/coaches/${coachId}`, undefined, { role: 'client' })
}

export function updateCoachMe(payload: CoachUpdatePayload): Promise<Coach> {
  return apiPut<Coach>('/coach/me', payload, { role: 'coach' })
}

export function fetchCoachStudentDetail(studentId: string): Promise<CoachStudentDetail> {
  return apiGet<CoachStudentDetail>(`/coach/students/${studentId}`, undefined, { role: 'coach' })
}
