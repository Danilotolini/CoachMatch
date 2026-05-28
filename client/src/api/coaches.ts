import { apiGet, apiPut } from '@/lib/http'
import type { CoachMe, CoachMePayload } from '@/types/api'

export function fetchCoachMe(): Promise<CoachMe> {
  return apiGet<CoachMe>('/coaches/me')
}

export function updateCoachMe(payload: CoachMePayload): Promise<CoachMe> {
  return apiPut<CoachMe>('/coaches/me', payload)
}
