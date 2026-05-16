import { describe, expect, it } from 'vitest'
import { getAuthUser, getToken, isTokenExpired } from './auth'
import { useSessionStore } from '@/stores/sessionStore'
import { loginAs } from '@/test/session'

function encodeJwt(payload: Record<string, unknown>): string {
  const base64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${base64}.signature`
}

describe('getToken', () => {
  it('retorna null quando não há sessão ativa', () => {
    expect(getToken()).toBeNull()
  })

  it('retorna o token do papel ativo', () => {
    loginAs('coach', 'abc')
    expect(getToken()).toBe('abc')
  })

  it('retorna null após endSession do papel ativo', () => {
    loginAs('coach', 'abc')
    useSessionStore.getState().endSession('coach')
    expect(getToken()).toBeNull()
  })
})

describe('getAuthUser', () => {
  it('retorna email e name nulos sem token', () => {
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('decodifica email e name do JWT', () => {
    loginAs('coach', encodeJwt({ email: 'foo@bar.com', name: 'Foo Bar' }))
    expect(getAuthUser()).toEqual({ email: 'foo@bar.com', name: 'Foo Bar' })
  })

  it('compõe name a partir de given_name + family_name quando name ausente', () => {
    loginAs('coach', encodeJwt({ email: 'x@y.com', given_name: 'Maria', family_name: 'Silva' }))
    expect(getAuthUser().name).toBe('Maria Silva')
  })

  it('retorna name null quando claims sem name', () => {
    loginAs('coach', encodeJwt({ email: 'x@y.com' }))
    expect(getAuthUser()).toEqual({ email: 'x@y.com', name: null })
  })

  it('retorna nulos quando o payload não é JSON válido', () => {
    loginAs('coach', 'header.invalid-payload.sig')
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('retorna nulos quando o token não tem payload', () => {
    loginAs('coach', 'semponto')
    expect(getAuthUser()).toEqual({ email: null, name: null })
  })

  it('ignora claim string vazia', () => {
    loginAs('coach', encodeJwt({ email: '   ', name: '' }))
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
