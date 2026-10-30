import { describe, it, expect, vi } from 'vitest'
import { ok, fail, getUser, parseBody, handle } from '../http.js'
import { ChatValidationError, ForbiddenError, NotFoundError } from '../errors.js'

describe('ok', () => {
  it('retorna payload com status 200 por padrão', () => {
    const res = ok({ foo: 'bar' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual({ foo: 'bar' })
  })

  it('aceita status code customizado', () => {
    const res = ok({ id: 1 }, 201)
    expect(res.statusCode).toBe(201)
  })
})

describe('getUser', () => {
  it('extrai o usuário das claims', () => {
    const event = { requestContext: { authorizer: { jwt: { claims: { sub: 'u1', name: 'João', email: 'j@x.com' } } } } }
    expect(getUser(event)).toEqual({ id: 'u1', name: 'João', email: 'j@x.com' })
  })

  it('retorna null quando sub está ausente', () => {
    expect(getUser({ requestContext: { authorizer: { jwt: { claims: {} } } } })).toBeNull()
    expect(getUser(null)).toBeNull()
  })

  it('usa email como nome quando name está ausente', () => {
    const event = { requestContext: { authorizer: { jwt: { claims: { sub: 'u2', email: 'a@b.com' } } } } }
    const user = getUser(event)
    expect(user.name).toBe('a@b.com')
  })
})

describe('parseBody', () => {
  it('retorna objeto vazio quando body está ausente', () => {
    expect(parseBody({})).toEqual({})
    expect(parseBody(null)).toEqual({})
  })

  it('faz parse do JSON do body', () => {
    expect(parseBody({ body: '{"x":1}' })).toEqual({ x: 1 })
  })

  it('lança ChatValidationError para JSON inválido', () => {
    expect(() => parseBody({ body: 'not-json' })).toThrow(ChatValidationError)
  })
})

describe('handle', () => {
  const makeEvent = (sub = 'u1') => ({
    requestContext: { authorizer: { jwt: { claims: { sub, name: 'Test' } } } },
  })

  it('chama o handler e envelopa o resultado', async () => {
    const fn = vi.fn().mockResolvedValue({ result: 'ok' })
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ result: 'ok' })
  })

  it('retorna 401 quando o usuário não está autenticado', async () => {
    const fn = vi.fn()
    const response = await handle(fn)({})
    expect(response.statusCode).toBe(401)
  })

  it('repassa resposta Lambda quando o handler já a retorna', async () => {
    const fn = vi.fn().mockResolvedValue({ statusCode: 204, body: '' })
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(204)
  })

  it('mapeia ChatValidationError para 400', async () => {
    const fn = vi.fn().mockRejectedValue(new ChatValidationError('campo inválido'))
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(400)
  })

  it('mapeia ForbiddenError para 403', async () => {
    const fn = vi.fn().mockRejectedValue(new ForbiddenError())
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(403)
  })

  it('mapeia NotFoundError para 404', async () => {
    const fn = vi.fn().mockRejectedValue(new NotFoundError())
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(404)
  })

  it('retorna 500 para erros inesperados', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    const response = await handle(fn)(makeEvent())
    expect(response.statusCode).toBe(500)
    consoleSpy.mockRestore()
  })
})
