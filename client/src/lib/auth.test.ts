import { describe, expect, it } from 'vitest'
import { clearToken, getAuthUser, getToken, isTokenExpired, setToken } from './auth'

function encodeJwt(payload: Record<string, unknown>): string {
  const base64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${base64}.signature`
}

describe('token storage', () => {
  it('getToken retorna null quando não há token', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken persiste e getToken recupera o valor', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
  })

  it('clearToken remove o token', () => {
    setToken('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

describe('getAuthUser', () => {
  it('retorna email e name nulos sem token', () => {
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('decodifica email e name do JWT', () => {
    setToken(encodeJwt({ email: 'foo@bar.com', name: 'Foo Bar' }))
    expect(getAuthUser()).toEqual({ email: 'foo@bar.com', name: 'Foo Bar' })
  })

  it('compõe name a partir de given_name + family_name quando name ausente', () => {
    setToken(encodeJwt({ email: 'x@y.com', given_name: 'Maria', family_name: 'Silva' }))
    expect(getAuthUser().name).toBe('Maria Silva')
  })

  it('retorna name null quando claims sem name', () => {
    setToken(encodeJwt({ email: 'x@y.com' }))
    expect(getAuthUser()).toEqual({ email: 'x@y.com', name: null })
  })

  it('retorna nulos quando o payload não é JSON válido', () => {
    setToken('header.invalid-payload.sig')
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('retorna nulos quando o token não tem payload', () => {
    setToken('semponto')
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('ignora claim string vazia', () => {
    setToken(encodeJwt({ email: '   ', name: '' }))
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })
})

describe('isTokenExpired', () => {
  it('retorna true quando exp está no passado', () => {
    const token = encodeJwt({ exp: 99 })
    expect(isTokenExpired(token, 100_000)).toBe(true)
  })

  it('retorna false quando exp está no futuro', () => {
    const token = encodeJwt({ exp: 101 })
    expect(isTokenExpired(token, 100_000)).toBe(false)
  })

  it('retorna false quando token não tem exp válido', () => {
    expect(isTokenExpired(encodeJwt({ email: 'foo@bar.com' }), 100_000)).toBe(false)
    expect(isTokenExpired('token-invalido', 100_000)).toBe(false)
  })
})
