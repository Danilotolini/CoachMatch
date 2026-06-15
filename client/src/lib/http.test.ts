import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { ApiError, apiGet, apiPost, apiPut } from './http'
import { server } from '@/mocks/server'
import { SESSION_EXPIRED_EVENT, getToken } from '@/lib/auth'
import { loginAs } from '@/test/session'
import { getSessionToken } from '@/stores/sessionStore'

function encodeJwt(payload: Record<string, unknown>): string {
  const base64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${base64}.signature`
}

afterEach(() => {
  localStorage.clear()
})

describe('ApiError', () => {
  it('expõe status e message', () => {
    const err = new ApiError(404, 'not found')
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(404)
    expect(err.message).toBe('not found')
    expect(err.name).toBe('ApiError')
  })
})

describe('apiGet', () => {
  it('faz GET e retorna o JSON parseado', async () => {
    server.use(http.get('http://api.test/echo', () => HttpResponse.json({ hello: 'world' })))

    const data = await apiGet<{ hello: string }>('/echo')
    expect(data).toEqual({ hello: 'world' })
  })

  it('serializa query params definidos e ignora undefined', async () => {
    let receivedUrl = ''
    server.use(
      http.get('http://api.test/items', ({ request }) => {
        receivedUrl = request.url
        return HttpResponse.json({})
      }),
    )

    await apiGet('/items', { search: 'abc', page: 2, ignored: undefined })
    const url = new URL(receivedUrl)
    expect(url.searchParams.get('search')).toBe('abc')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.has('ignored')).toBe(false)
  })

  it('inclui Authorization Bearer quando há token', async () => {
    loginAs('coach', 'jwt-abc')
    let receivedAuth: string | null = null
    server.use(
      http.get('http://api.test/secure', ({ request }) => {
        receivedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    await apiGet('/secure')
    expect(receivedAuth).toBe('Bearer jwt-abc')
  })

  it('omite Authorization quando não há token', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get('http://api.test/secure', ({ request }) => {
        receivedAuth = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    await apiGet('/secure')
    expect(receivedAuth).toBeNull()
  })

  it('lança ApiError com status quando o response não é ok', async () => {
    server.use(
      http.get('http://api.test/boom', () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    )

    await expect(apiGet('/boom')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    })
  })

  it('limpa token e notifica sessão expirada em 401', async () => {
    const listener = vi.fn()
    loginAs('coach', 'jwt-abc')
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    server.use(
      http.get('http://api.test/secure', () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 }),
      ),
    )

    await expect(apiGet('/secure')).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: 'unauthorized',
      status: 401,
    })
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('limpa apenas a sessão ativa em 401', async () => {
    loginAs('coach', 'coach-token')
    loginAs('client', 'client-token')
    server.use(
      http.get('http://api.test/secure', () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 }),
      ),
    )

    await expect(apiGet('/secure')).rejects.toMatchObject({ status: 401 })
    expect(getToken()).toBeNull()
    expect(getSessionToken('client')).toBeNull()
    expect(getSessionToken('coach')).toBe('coach-token')
  })

  it('limpa apenas a sessão informada em 401 quando request tem role', async () => {
    loginAs('coach', 'coach-token')
    loginAs('client', 'client-token')
    server.use(
      http.get('http://api.test/secure', () =>
        HttpResponse.json({ error: 'unauthorized' }, { status: 401 }),
      ),
    )

    await expect(apiGet('/secure', undefined, { role: 'coach' })).rejects.toMatchObject({
      status: 401,
    })
    expect(getSessionToken('coach')).toBeNull()
    expect(getSessionToken('client')).toBe('client-token')
    expect(getToken()).toBe('client-token')
  })

  it('não chama API quando token local já expirou', async () => {
    const listener = vi.fn()
    const requestSpy = vi.fn()
    loginAs('coach', encodeJwt({ exp: Math.floor(Date.now() / 1000) - 1 }))
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    server.use(
      http.get('http://api.test/secure', () => {
        requestSpy()
        return HttpResponse.json({})
      }),
    )

    await expect(apiGet('/secure')).rejects.toMatchObject({ status: 401 })
    expect(requestSpy).not.toHaveBeenCalled()
    expect(getToken()).toBeNull()
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: 'expired',
      status: 401,
    })
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('não chama API e encerra apenas a role informada quando esse token já expirou', async () => {
    const listener = vi.fn()
    const requestSpy = vi.fn()
    loginAs('coach', encodeJwt({ exp: Math.floor(Date.now() / 1000) - 1 }))
    loginAs('client', 'client-token')
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    server.use(
      http.get('http://api.test/secure', () => {
        requestSpy()
        return HttpResponse.json({})
      }),
    )

    await expect(apiGet('/secure', undefined, { role: 'coach' })).rejects.toMatchObject({
      status: 401,
    })
    expect(requestSpy).not.toHaveBeenCalled()
    expect(getSessionToken('coach')).toBeNull()
    expect(getSessionToken('client')).toBe('client-token')
    expect(getToken()).toBe('client-token')
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      reason: 'expired',
      status: 401,
      role: 'coach',
    })
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('retorna undefined quando o body está vazio', async () => {
    server.use(http.get('http://api.test/empty', () => new HttpResponse(null, { status: 200 })))

    const data = await apiGet('/empty')
    expect(data).toBeUndefined()
  })
})

describe('apiPost', () => {
  it('envia body JSON com Content-Type correto', async () => {
    let received: { body: unknown; contentType: string | null } = {
      body: null,
      contentType: null,
    }
    server.use(
      http.post('http://api.test/items', async ({ request }) => {
        received = {
          body: await request.json(),
          contentType: request.headers.get('Content-Type'),
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiPost('/items', { name: 'foo' })
    expect(received.body).toEqual({ name: 'foo' })
    expect(received.contentType).toBe('application/json')
  })

  it('omite Content-Type e body quando não há body', async () => {
    let receivedContentType: string | null = 'sentinel'
    server.use(
      http.post('http://api.test/ping', ({ request }) => {
        receivedContentType = request.headers.get('Content-Type')
        return HttpResponse.json({})
      }),
    )

    await apiPost('/ping')
    expect(receivedContentType).toBeNull()
  })
})

describe('apiPut', () => {
  it('envia PUT com body JSON', async () => {
    let receivedMethod = ''
    let receivedBody: unknown = null
    server.use(
      http.put('http://api.test/items/1', async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiPut('/items/1', { name: 'bar' })
    expect(receivedMethod).toBe('PUT')
    expect(receivedBody).toEqual({ name: 'bar' })
  })
})
