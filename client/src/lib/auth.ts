const TOKEN_KEY = 'idToken'

export interface AuthUser {
  email: string | null
  name: string | null
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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

function stringClaim(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key]
  return typeof value === 'string' && value.trim() ? value : null
}

export function getAuthUser(): AuthUser {
  const token = getToken()
  if (!token) return { email: null, name: null }

  const [, payload] = token.split('.')
  if (!payload) return { email: null, name: null }

  try {
    const claims: unknown = JSON.parse(base64UrlDecode(payload))
    if (!isRecord(claims)) return { email: null, name: null }

    const givenName = stringClaim(claims, 'given_name')
    const familyName = stringClaim(claims, 'family_name')
    const fullName = [givenName, familyName].filter(Boolean).join(' ')

    return {
      email: stringClaim(claims, 'email'),
      name: stringClaim(claims, 'name') ?? (fullName || null),
    }
  } catch {
    return { email: null, name: null }
  }
}
