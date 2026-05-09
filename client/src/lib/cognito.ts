import { env } from '@/lib/env'
import { clearToken } from '@/lib/auth'

export type CognitoAudience = 'coach' | 'student'

function pkceKey(audience: CognitoAudience): string {
  return `cognito_${audience}_pkce_verifier`
}

function stateKey(audience: CognitoAudience): string {
  return `cognito_${audience}_oauth_state`
}

interface CognitoClientConfig {
  clientId: string
  clientSecret: string | null
  domain: string
  redirectUri: string
}

function redirectUri(audience: CognitoAudience): string {
  if (audience === 'student') return `${window.location.origin}/auth/cognito/student/callback`
  return `${window.location.origin}/auth/cognito/callback`
}

function clientConfig(audience: CognitoAudience): CognitoClientConfig {
  if (audience === 'student') {
    return {
      clientId: env.cognitoStudentClientId,
      clientSecret: null,
      domain: env.cognitoStudentDomain,
      redirectUri: redirectUri(audience),
    }
  }

  return {
    clientId: env.cognitoClientId,
    clientSecret: env.cognitoClientSecret,
    domain: env.cognitoDomain,
    redirectUri: redirectUri(audience),
  }
}

function logoutUri(returnPath: string): string {
  if (returnPath === '/') return window.location.origin
  return `${window.location.origin}${returnPath}`
}

export function getLogoutUrl(returnPath = '/', audience: CognitoAudience = 'coach'): string {
  const config = clientConfig(audience)
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: logoutUri(returnPath),
  })
  return `${config.domain}/logout?${params.toString()}`
}

// Limpa token local e redireciona para o /logout do Cognito Hosted UI,
// que encerra a sessão lá e devolve o usuário ao logout_uri configurado.
// O logout_uri precisa estar na lista "Allowed sign-out URLs" do App Client.
export function logout(returnPath = '/', audience: CognitoAudience = 'coach'): void {
  clearToken()
  window.location.href = getLogoutUrl(returnPath, audience)
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

export async function getLoginUrl(audience: CognitoAudience = 'coach'): Promise<string> {
  const config = clientConfig(audience)
  const verifier = randomBase64Url(32)
  const challenge = base64UrlEncode(await sha256(verifier))
  const state = randomBase64Url(16)

  sessionStorage.setItem(pkceKey(audience), verifier)
  sessionStorage.setItem(stateKey(audience), state)

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: config.redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  return `${config.domain}/oauth2/authorize?${params}`
}

interface TokenResponse {
  id_token: string
  access_token: string
  refresh_token?: string | undefined
  expires_in: number
}

interface CognitoErrorResponse {
  error: string
  error_description?: string | undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCognitoError(value: unknown): CognitoErrorResponse {
  if (!isRecord(value) || typeof value['error'] !== 'string') {
    return { error: 'Erro ao trocar código de autenticação.' }
  }

  return {
    error: value['error'],
    error_description:
      typeof value['error_description'] === 'string' ? value['error_description'] : undefined,
  }
}

function parseTokenResponse(value: unknown): TokenResponse {
  if (
    !isRecord(value) ||
    typeof value['id_token'] !== 'string' ||
    typeof value['access_token'] !== 'string' ||
    typeof value['expires_in'] !== 'number'
  ) {
    throw new Error('Resposta de autenticação inválida.')
  }

  return {
    id_token: value['id_token'],
    access_token: value['access_token'],
    refresh_token: typeof value['refresh_token'] === 'string' ? value['refresh_token'] : undefined,
    expires_in: value['expires_in'],
  }
}

export async function exchangeCodeForTokens(
  code: string,
  state: string | null,
  audience: CognitoAudience = 'coach',
): Promise<TokenResponse> {
  const config = clientConfig(audience)
  const expectedState = sessionStorage.getItem(stateKey(audience))
  const verifier = sessionStorage.getItem(pkceKey(audience))
  sessionStorage.removeItem(stateKey(audience))
  sessionStorage.removeItem(pkceKey(audience))

  if (!expectedState || expectedState !== state) {
    throw new Error('Estado inválido. Reinicie o login.')
  }
  if (!verifier) {
    throw new Error('Sessão de login expirada. Tente novamente.')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  })

  if (config.clientSecret) {
    body.append('client_secret', config.clientSecret)
  }

  const res = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = parseCognitoError(await res.json())
    throw new Error(err.error_description ?? err.error)
  }

  return parseTokenResponse(await res.json())
}
