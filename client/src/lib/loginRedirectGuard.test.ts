import { afterEach, describe, expect, it } from 'vitest'
import {
  claimLoginRedirect,
  releaseLoginRedirect,
  resetLoginRedirects,
} from './loginRedirectGuard'

afterEach(() => {
  resetLoginRedirects()
})

describe('claimLoginRedirect', () => {
  it('retorna true na primeira chamada para o papel', () => {
    expect(claimLoginRedirect('client')).toBe(true)
  })

  it('retorna false em chamadas subsequentes para o mesmo papel', () => {
    claimLoginRedirect('coach')
    expect(claimLoginRedirect('coach')).toBe(false)
  })

  it('trata client e coach de forma independente', () => {
    expect(claimLoginRedirect('client')).toBe(true)
    expect(claimLoginRedirect('coach')).toBe(true)
  })
})

describe('releaseLoginRedirect', () => {
  it('permite reclamar o redirect após release', () => {
    claimLoginRedirect('client')
    releaseLoginRedirect('client')
    expect(claimLoginRedirect('client')).toBe(true)
  })
})

describe('resetLoginRedirects', () => {
  it('limpa todos os redirects registrados', () => {
    claimLoginRedirect('client')
    claimLoginRedirect('coach')
    resetLoginRedirects()
    expect(claimLoginRedirect('client')).toBe(true)
    expect(claimLoginRedirect('coach')).toBe(true)
  })
})
