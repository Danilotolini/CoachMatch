import { env } from '@/lib/env'
import { queryClient } from '@/lib/queryClient'
import { clearPersistedSession, type Role, useSessionStore } from '@/stores/sessionStore'

type ExternalAudience = 'coach' | 'student'

function externalAudience(role: Role): ExternalAudience {
  return role === 'client' ? 'student' : 'coach'
}

function pkceKey(role: Role): string {
  return `cognito_${externalAudience(role)}_pkce_verifier`
}

function stateKey(role: Role): string {
  return `cognito_${externalAudience(role)}_oauth_state`
}

interface CognitoClientConfig {
  clientId: string
  clientSecret: string | null
  domain: string
  redirectUri: string
}

function redirectUri(role: Role): string {
  if (role === 'client') return `${window.location.origin}/auth/cognito/student/callback`
  return `${window.location.origin}/auth/cognito/callback`
}

function clientConfig(role: Role): CognitoClientConfig {
  if (role === 'client') {
    return {
      clientId: env.cognitoStudentClientId,
      clientSecret: null,
      domain: env.cognitoStudentDomain,
      redirectUri: redirectUri(role),
    }
  }

  return {
    clientId: env.cognitoClientId,
    clientSecret: env.cognitoClientSecret,
    domain: env.cognitoDomain,
    redirectUri: redirectUri(role),
  }
}

function defaultReturnPath(): string {
  return '/'
}

function logoutUri(returnPath: string): string {
  if (returnPath === '/') return window.location.origin
  return `${window.location.origin}${returnPath}`
}

export function getLogoutUrl(role: Role, returnPath: string = defaultReturnPath()): string {
  const config = clientConfig(role)
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: logoutUri(returnPath),
  })
  return `${config.domain}/logout?${params.toString()}`
}

// Limpa apenas a sessão do papel atual e redireciona para o /logout do
// Cognito Hosted UI, que encerra a sessão lá e devolve o usuário à tela
// de login do mesmo papel. Sessões de outros papéis permanecem ativas.
//
// A sessão é removida do storage persistido (via `clearPersistedSession`) em vez
// de `endSession`: não mutamos o store em memória de propósito. Mutar dispararia
// os route guards reativos, que redirecionam para a tela de login e iniciam um
// novo /authorize antes de atingirmos o /logout do Cognito — essa segunda
// navegação sobrescreve o redirect de logout e o Hosted UI devolve um code novo
// (re-login silencioso), nunca encerrando a sessão. Como esta é a única
// navegação, o Cognito de fato encerra a sessão; ao voltarmos, o store
// re-hidrata do storage já sem a sessão do papel.
export function logout(role: Role, returnPath: string = defaultReturnPath()): void {
  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCKING === 'enabled') {
    useSessionStore.persist.clearStorage()
    queryClient.clear()
    window.location.replace(returnPath)
    return
  }

  clearPersistedSession(role)
  queryClient.clear()
  window.location.href = getLogoutUrl(role, returnPath)
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

export async function getLoginUrl(role: Role): Promise<string> {
  const config = clientConfig(role)
  const verifier = randomBase64Url(32)
  const challenge = base64UrlEncode(await sha256(verifier))
  const state = randomBase64Url(16)

  sessionStorage.setItem(pkceKey(role), verifier)
  sessionStorage.setItem(stateKey(role), state)

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
  role: Role,
): Promise<TokenResponse> {
  const config = clientConfig(role)
  const expectedState = sessionStorage.getItem(stateKey(role))
  const verifier = sessionStorage.getItem(pkceKey(role))
  sessionStorage.removeItem(stateKey(role))
  sessionStorage.removeItem(pkceKey(role))

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
