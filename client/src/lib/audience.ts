import type { CognitoAudience } from '@/lib/cognito'

export type AppAudience = 'coach' | 'client'

export function toCognitoAudience(audience: AppAudience): CognitoAudience {
  return audience === 'client' ? 'student' : 'coach'
}
