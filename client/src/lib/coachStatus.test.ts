import { describe, expect, it } from 'vitest'
import { COACH_ONBOARDING_STATUSES, coachStatusRoute, isCoachOnboardingStatus } from './coachStatus'

describe('coachStatus', () => {
  it('reconhece status de onboarding', () => {
    expect(COACH_ONBOARDING_STATUSES).toContain('PENDING_PROFILE')
    expect(isCoachOnboardingStatus('PENDING_PROFILE')).toBe(true)
    expect(isCoachOnboardingStatus('APPROVED')).toBe(false)
  })

  it('resolve a rota por status com fallback seguro', () => {
    expect(coachStatusRoute('APPROVED')).toBe('/coach')
    expect(coachStatusRoute('PENDING_PROFILE')).toBe('/coach/onboarding')
    expect(coachStatusRoute('UNKNOWN_STATUS' as never)).toBe('/coach/onboarding')
  })
})
