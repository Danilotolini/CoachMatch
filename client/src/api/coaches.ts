import { apiGet, apiPost, apiPut } from '@/lib/http'
import type { Coach, CoachUpdatePayload } from '@/types/api'

export function fetchCoachMe(): Promise<Coach> {
  return apiGet<Coach>('/coaches/me')
}

export function updateCoachMe(payload: CoachUpdatePayload): Promise<Coach> {
  return apiPut<Coach>('/coaches/me', payload)
}

export function submitCoachForReview(): Promise<Coach> {
  return apiPost<Coach>('/coaches/me/submit-for-review', {})
}
