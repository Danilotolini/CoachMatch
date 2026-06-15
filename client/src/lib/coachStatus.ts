import type { CoachStatus } from '@/types/api'

// Status em que o perfil do coach ainda não foi preenchido.
export const COACH_ONBOARDING_STATUSES: CoachStatus[] = ['PENDING_PROFILE']

export function isCoachOnboardingStatus(status: CoachStatus): boolean {
  return COACH_ONBOARDING_STATUSES.includes(status)
}

// Rota de destino para um status de coach. Tem fallback explícito para o
// onboarding: um status desconhecido nunca deve resultar em navegação para
// `undefined` (o que deixa a UI presa no spinner).
export function coachStatusRoute(status: CoachStatus): string {
  if (isCoachOnboardingStatus(status)) return '/coach/onboarding'
  switch (status) {
    case 'APPROVED':
      return '/coach'
    default:
      return '/coach/onboarding'
  }
}
