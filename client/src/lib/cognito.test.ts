import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  exchangeCodeForTokens,
  getLoginUrl,
  getLogoutUrl,
  logout,
} from './cognito'
import { server } from '@/mocks/server'
import { setToken, getToken } from '@/lib/auth'

const ORIGINAL_LOCATION = window.location

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...ORIGINAL_LOCATION, origin: 'http://app.test', href: 'http://app.test/' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: ORIGINAL_LOCATION,
  })
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('getLogoutUrl', () => {
  it('monta URL de logout com client_id e logout_uri', () => {
    const url = getLogoutUrl('/bye')
    expect(url).toContain('test.auth.us-east-1.amazoncognito.com/logout?')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('logout_uri=http%3A%2F%2Fapp.test%2Fbye')
  })

  it('usa "/" como default', () => {
    expect(getLogoutUrl()).toContain('logout_uri=http%3A%2F%2Fapp.test%2F')
  })
})

describe('logout', () => {
  it('limpa token e redireciona para URL de logout do Cognito', () => {
    setToken('abc')
    logout('/bye')
    expect(getToken()).toBeNull()
    expect(window.location.href).toContain('/logout')
    expect(window.location.href).toContain('logout_uri=http%3A%2F%2Fapp.test%2Fbye')
  })
})

describe('getLoginUrl', () => {
  it('grava PKCE verifier + state e retorna URL de authorize', async () => {
    const raw = await getLoginUrl()
    const [base, query] = raw.split('?')
    const params = new URLSearchParams(query)

    expect(base).toBe('test.auth.us-east-1.amazoncognito.com/oauth2/authorize')
    expect(params.get('client_id')).toBe('test-client-id')
    expect(params.get('response_type')).toBe('code')
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('redirect_uri')).toBe('http://app.test/auth/cognito/callback')

    const state = params.get('state')
    const challenge = params.get('code_challenge')
    expect(state).toBeTruthy()
    expect(challenge).toBeTruthy()

    expect(sessionStorage.getItem('cognito_oauth_state')).toBe(state)
    expect(sessionStorage.getItem('cognito_pkce_verifier')).toBeTruthy()
  })
})

describe('exchangeCodeForTokens', () => {
  function seedSession(state: string, verifier: string) {
    sessionStorage.setItem('cognito_oauth_state', state)
    sessionStorage.setItem('cognito_pkce_verifier', verifier)
  }

  it('troca code por tokens quando state confere', async () => {
    seedSession('xyz', 'verifier-123')
    server.use(
      http.post(
        '*/oauth2/token',
        () =>
          HttpResponse.json({
            id_token: 'id-1',
            access_token: 'acc-1',
            refresh_token: 'ref-1',
            expires_in: 3600,
          }),
      ),
    )

    const tokens = await exchangeCodeForTokens('code-abc', 'xyz')
    expect(tokens.id_token).toBe('id-1')
    expect(tokens.refresh_token).toBe('ref-1')

    // session foi consumida
    expect(sessionStorage.getItem('cognito_oauth_state')).toBeNull()
    expect(sessionStorage.getItem('cognito_pkce_verifier')).toBeNull()
  })

  it('rejeita quando state não confere', async () => {
    seedSession('xyz', 'verifier-123')
    await expect(exchangeCodeForTokens('code-abc', 'outro')).rejects.toThrow(/Estado inválido/i)
  })

  it('rejeita quando não há verifier salvo', async () => {
    sessionStorage.setItem('cognito_oauth_state', 'xyz')
    await expect(exchangeCodeForTokens('code-abc', 'xyz')).rejects.toThrow(/Sessão de login/i)
  })

  it('propaga error_description do Cognito quando token endpoint falha', async () => {
    seedSession('xyz', 'verifier-123')
    server.use(
      http.post('*/oauth2/token', () =>
        HttpResponse.json(
          { error: 'invalid_grant', error_description: 'code expirado' },
          { status: 400 },
        ),
      ),
    )

    await expect(exchangeCodeForTokens('code-abc', 'xyz')).rejects.toThrow('code expirado')
  })

  it('rejeita quando a resposta tem formato inválido', async () => {
    seedSession('xyz', 'verifier-123')
    server.use(
      http.post('*/oauth2/token', () =>
        HttpResponse.json({ id_token: 'só-isso' }),
      ),
    )

    await expect(exchangeCodeForTokens('code-abc', 'xyz')).rejects.toThrow(
      /Resposta de autenticação inválida/i,
    )
  })
})
