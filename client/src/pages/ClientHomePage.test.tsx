import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientHomePage from './ClientHomePage'
import * as cognito from '@/lib/cognito'
import { loginAs } from '@/test/session'

function base64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeIdToken(payload: Record<string, unknown>) {
  return ['header', base64Url(JSON.stringify(payload)), 'signature'].join('.')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ClientHomePage', () => {
  it('mostra o primeiro nome do aluno autenticado', () => {
    loginAs('client', makeIdToken({ name: 'Ana Paula', email: 'ana@example.com' }))

    render(<ClientHomePage />)

    expect(screen.getByRole('heading', { name: 'Oi, Ana' })).toBeInTheDocument()
  })

  it('usa fallback "aluno" quando token não tem nome', () => {
    loginAs('client', makeIdToken({ email: 'sem-nome@example.com' }))

    render(<ClientHomePage />)

    expect(screen.getByRole('heading', { name: 'Oi, aluno' })).toBeInTheDocument()
  })

  it('renderiza cards e navegação principais da home', () => {
    loginAs('client', makeIdToken({ given_name: 'Joao', family_name: 'Silva' }))

    render(<ClientHomePage />)

    expect(screen.getByText('Próxima sessão')).toBeInTheDocument()
    expect(screen.getByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getByText('Julia Ramos')).toBeInTheDocument()
    expect(screen.getAllByText('Buscar')).toHaveLength(2)
    expect(screen.getAllByText('Perfil')).toHaveLength(2)
  })

  it('chama logout de aluno ao clicar em Sair', async () => {
    const logoutSpy = vi.spyOn(cognito, 'logout').mockImplementation(() => undefined)
    loginAs('client', makeIdToken({ name: 'Ana Paula' }))

    render(<ClientHomePage />)

    await userEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])

    expect(logoutSpy).toHaveBeenCalledWith('client')
  })
})
