import { env } from '@/lib/env'

const PKCE_KEY = 'cognito_pkce_verifier'
const STATE_KEY = 'cognito_oauth_state'

function redirectUri(): string {
  return `${window.location.origin}/auth/cognito/callback`
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes.buffer)
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
}

export async function getLoginUrl(): Promise<string> {
  const verifier = randomBase64Url(32)
  const challenge = base64UrlEncode(await sha256(verifier))
  const state = randomBase64Url(16)

  sessionStorage.setItem(PKCE_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: env.cognitoClientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return `${env.cognitoDomain}/oauth2/authorize?${params}`
}

interface TokenResponse {
  id_token: string
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeCodeForTokens(
  code: string,
  state: string | null,
): Promise<TokenResponse> {
  const expectedState = sessionStorage.getItem(STATE_KEY)
  const verifier = sessionStorage.getItem(PKCE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(PKCE_KEY)

  if (!expectedState || expectedState !== state) {
    throw new Error('Estado inválido. Reinicie o login.')
  }
  if (!verifier) {
    throw new Error('Sessão de login expirada. Tente novamente.')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.cognitoClientId,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  })

  if (env.cognitoClientSecret) {
    body.append('client_secret', env.cognitoClientSecret)
  }

  const res = await fetch(`${env.cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = (await res.json()) as { error: string; error_description?: string }
    throw new Error(err.error_description ?? err.error)
  }

  return res.json() as Promise<TokenResponse>
}
