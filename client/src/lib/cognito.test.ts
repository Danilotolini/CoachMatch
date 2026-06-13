import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { exchangeCodeForTokens, getLoginUrl, getLogoutUrl, logout } from './cognito'
import { server } from '@/mocks/server'
import { getToken } from '@/lib/auth'
import { loginAs } from '@/test/session'
import { getSessionToken, useSessionStore } from '@/stores/sessionStore'

function mockLocation(overrides: Partial<Location>): Location {
  const base = {
    origin: 'http://app.test',
    href: 'http://app.test/',
    pathname: '/',
    search: '',
    hash: '',
    host: 'app.test',
    hostname: 'app.test',
    port: '',
    protocol: 'http:',
    assign: () => undefined,
    replace: () => undefined,
    reload: () => undefined,
    toString: () => 'http://app.test/',
  }
  return { ...base, ...overrides } as unknown as Location
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MOCKING', 'disabled')
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({ origin: 'http://app.test', href: 'http://app.test/' }),
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({}),
  })
  sessionStorage.clear()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getLogoutUrl', () => {
  it('monta URL de logout com client_id e logout_uri', () => {
    const url = getLogoutUrl('coach', '/bye')
    expect(url).toContain('test.auth.us-east-1.amazoncognito.com/logout?')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('logout_uri=http%3A%2F%2Fapp.test%2Fbye')
  })

  it('usa a welcome como returnPath default', () => {
    expect(getLogoutUrl('coach')).toContain('logout_uri=http%3A%2F%2Fapp.test')
    expect(getLogoutUrl('client')).toContain('logout_uri=http%3A%2F%2Fapp.test')
  })

  it('monta URL de logout para o app client de aluno', () => {
    const url = getLogoutUrl('client', '/')
    expect(url).toContain('/logout?')
    expect(url).toContain('client_id=3rjn45koljliioocd5usijdv9s')
    expect(url).toContain('logout_uri=http%3A%2F%2Fapp.test')
  })
})

describe('logout', () => {
  it('limpa sessão do papel e redireciona para URL de logout do Cognito', () => {
    loginAs('coach', 'abc')
    logout('coach', '/bye')
    expect(getToken()).toBeNull()
    expect(window.location.href).toContain('/logout')
    expect(window.location.href).toContain('logout_uri=http%3A%2F%2Fapp.test%2Fbye')
  })

  it('preserva sessão de outro papel ao deslogar', () => {
    loginAs('client', 'aluno-token')
    loginAs('coach', 'coach-token')
    logout('coach', '/bye')
    // sessão do aluno permanece disponível para reativação
    expect(getToken()).toBeNull()
    expect(getSessionToken('client')).toBe('aluno-token')
    useSessionStore.getState().setActiveRole('client')
    expect(getToken()).toBe('aluno-token')
  })

  it('em mock mode, redireciona pro returnPath sem chamar o Cognito', () => {
    const replace = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation({ origin: 'http://app.test', href: 'http://app.test/', replace }),
    })
    vi.stubEnv('VITE_API_MOCKING', 'enabled')
    loginAs('coach', 'abc')
    logout('coach', '/bye')
    expect(getToken()).toBe('abc')
    expect(localStorage.getItem('coachmatch:session')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/bye')
    expect(window.location.href).not.toContain('/logout?')
  })

  it('em mock mode, redireciona para a welcome por default', () => {
    const replace = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation({ origin: 'http://app.test', href: 'http://app.test/', replace }),
    })
    vi.stubEnv('VITE_API_MOCKING', 'enabled')
    loginAs('client', 'abc')
    logout('client')
    expect(getToken()).toBe('abc')
    expect(localStorage.getItem('coachmatch:session')).toBeNull()
    expect(replace).toHaveBeenCalledWith('/')
  })
})

describe('getLoginUrl', () => {
  it('grava PKCE verifier + state e retorna URL de authorize', async () => {
    const raw = await getLoginUrl('coach')
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

    expect(sessionStorage.getItem('cognito_coach_oauth_state')).toBe(state)
    expect(sessionStorage.getItem('cognito_coach_pkce_verifier')).toBeTruthy()
  })

  it('usa redirect e chaves PKCE de aluno', async () => {
    const raw = await getLoginUrl('client')
    const [, query] = raw.split('?')
    const params = new URLSearchParams(query)

    expect(params.get('client_id')).toBe('3rjn45koljliioocd5usijdv9s')
    expect(params.get('redirect_uri')).toBe('http://app.test/auth/cognito/student/callback')
    expect(sessionStorage.getItem('cognito_student_oauth_state')).toBe(params.get('state'))
    expect(sessionStorage.getItem('cognito_student_pkce_verifier')).toBeTruthy()
  })
})

describe('exchangeCodeForTokens', () => {
  function seedSession(state: string, verifier: string) {
    sessionStorage.setItem('cognito_coach_oauth_state', state)
    sessionStorage.setItem('cognito_coach_pkce_verifier', verifier)
  }

  it('troca code por tokens quando state confere', async () => {
    seedSession('xyz', 'verifier-123')
    server.use(
      http.post('*/oauth2/token', () =>
        HttpResponse.json({
          id_token: 'id-1',
          access_token: 'acc-1',
          refresh_token: 'ref-1',
          expires_in: 3600,
        }),
      ),
    )

    const tokens = await exchangeCodeForTokens('code-abc', 'xyz', 'coach')
    expect(tokens.id_token).toBe('id-1')
    expect(tokens.refresh_token).toBe('ref-1')

    // session foi consumida
    expect(sessionStorage.getItem('cognito_coach_oauth_state')).toBeNull()
    expect(sessionStorage.getItem('cognito_coach_pkce_verifier')).toBeNull()
  })

  it('rejeita quando state não confere', async () => {
    seedSession('xyz', 'verifier-123')
    await expect(exchangeCodeForTokens('code-abc', 'outro', 'coach')).rejects.toThrow(
      /Estado inválido/i,
    )
  })

  it('rejeita quando não há verifier salvo', async () => {
    sessionStorage.setItem('cognito_coach_oauth_state', 'xyz')
    await expect(exchangeCodeForTokens('code-abc', 'xyz', 'coach')).rejects.toThrow(
      /Sessão de login/i,
    )
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

    await expect(exchangeCodeForTokens('code-abc', 'xyz', 'coach')).rejects.toThrow('code expirado')
  })

  it('rejeita quando a resposta tem formato inválido', async () => {
    seedSession('xyz', 'verifier-123')
    server.use(http.post('*/oauth2/token', () => HttpResponse.json({ id_token: 'só-isso' })))

    await expect(exchangeCodeForTokens('code-abc', 'xyz', 'coach')).rejects.toThrow(
      /Resposta de autenticação inválida/i,
    )
  })

  it('troca code de aluno sem enviar client_secret', async () => {
    sessionStorage.setItem('cognito_student_oauth_state', 'xyz')
    sessionStorage.setItem('cognito_student_pkce_verifier', 'verifier-123')

    let body = ''
    server.use(
      http.post('*/oauth2/token', async ({ request }) => {
        body = await request.text()
        return HttpResponse.json({
          id_token: 'student-id',
          access_token: 'student-access',
          expires_in: 3600,
        })
      }),
    )

    const tokens = await exchangeCodeForTokens('code-abc', 'xyz', 'client')

    expect(tokens.id_token).toBe('student-id')
    expect(body).toContain('client_id=3rjn45koljliioocd5usijdv9s')
    expect(body).toContain(
      'redirect_uri=http%3A%2F%2Fapp.test%2Fauth%2Fcognito%2Fstudent%2Fcallback',
    )
    expect(body).not.toContain('client_secret=')
  })
})
