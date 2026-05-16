import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from './LoginPage'
import * as cognito from '@/lib/cognito'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'

const ORIGINAL_LOCATION = window.location
const LOCATION_PROTOTYPE = Object.getPrototypeOf(ORIGINAL_LOCATION) as object | null

function mockLocation(overrides: Partial<Location>) {
  return Object.assign(Object.create(LOCATION_PROTOTYPE) as Location, ORIGINAL_LOCATION, overrides)
}

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({ href: 'http://localhost/coach/login' }),
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({}),
  })
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('redireciona para a URL de login do Cognito', async () => {
    const url = 'https://cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(<LoginPage audience="coach" />)

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('coach')
  })

  it('passa audience de aluno ao gerar URL de login', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(<LoginPage audience="client" />)

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('client')
  })

  it('mostra mensagem de erro se falhar ao gerar URL', async () => {
    vi.spyOn(cognito, 'getLoginUrl').mockRejectedValue(new Error('boom'))

    render(<LoginPage audience="coach" />)

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('redireciona para dashboard de coach quando já existe sessão de coach', () => {
    const replace = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation({ href: 'http://localhost/coach/login', replace }),
    })
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl')
    loginAs('coach')

    render(<LoginPage audience="coach" />)

    expect(replace).toHaveBeenCalledWith('/coach')
    expect(getLoginUrlSpy).not.toHaveBeenCalled()
  })

  it('reativa sessão de aluno e redireciona conforme onboarded', () => {
    const replace = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: mockLocation({ href: 'http://localhost/client/login', replace }),
    })
    vi.spyOn(cognito, 'getLoginUrl')
    loginAs('client')
    useSessionStore.getState().markClientOnboarded()
    useSessionStore.setState((state) => ({ ...state, activeRole: null }))

    render(<LoginPage audience="client" />)

    expect(replace).toHaveBeenCalledWith('/client')
    expect(useSessionStore.getState().activeRole).toBe('client')
  })
})
