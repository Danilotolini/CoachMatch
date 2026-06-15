import { getActiveToken } from '@/stores/sessionStore'

export const SESSION_EXPIRED_EVENT = 'coachmatch:session-expired'

export interface AuthUser {
  email: string | null
  name: string | null
}

export interface SessionExpiredDetail {
  reason: 'expired' | 'unauthorized'
  status?: number
}

export function getToken(): string | null {
  return getActiveToken()
}

function base64UrlDecode(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getTokenClaims(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    const claims: unknown = JSON.parse(base64UrlDecode(payload))
    return isRecord(claims) ? claims : null
  } catch {
    return null
  }
}

function stringClaim(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key]
  return typeof value === 'string' && value.trim() ? value : null
}

export function isTokenExpired(token: string | null = getToken(), now = Date.now()): boolean {
  if (!token) return true

  const claims = getTokenClaims(token)
  const exp = claims?.['exp']
  if (typeof exp !== 'number') return false

  return exp * 1000 <= now
}

export function notifySessionExpired(detail: SessionExpiredDetail): void {
  window.dispatchEvent(new CustomEvent<SessionExpiredDetail>(SESSION_EXPIRED_EVENT, { detail }))
}

export function getAuthUser(): AuthUser {
  const token = getToken()
  if (!token) return { email: null, name: null }

  const claims = getTokenClaims(token)
  if (!claims) return { email: null, name: null }

  const givenName = stringClaim(claims, 'given_name')
  const familyName = stringClaim(claims, 'family_name')
  const fullName = [givenName, familyName].filter(Boolean).join(' ')

  return {
    email: stringClaim(claims, 'email'),
    name: stringClaim(claims, 'name') ?? (fullName || null),
  }
}
