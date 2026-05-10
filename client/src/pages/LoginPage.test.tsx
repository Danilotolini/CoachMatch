import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from './LoginPage'
import * as cognito from '@/lib/cognito'

const ORIGINAL_LOCATION = window.location

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...ORIGINAL_LOCATION, href: 'http://localhost/coach/entrar' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: ORIGINAL_LOCATION,
  })
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('redireciona para a URL de login do Cognito', async () => {
    const url = 'https://cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(<LoginPage />)

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('coach')
  })

  it('usa a audiência de aluno ao renderizar login de aluno', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(<LoginPage audience="student" />)

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('student')
  })

  it('mostra mensagem de erro se falhar ao gerar URL', async () => {
    vi.spyOn(cognito, 'getLoginUrl').mockRejectedValue(new Error('boom'))

    render(<LoginPage />)

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
