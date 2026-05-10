import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentHomePage from './StudentHomePage'
import { setToken } from '@/lib/auth'
import * as cognito from '@/lib/cognito'

function base64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeIdToken(payload: Record<string, unknown>) {
  return ['header', base64Url(JSON.stringify(payload)), 'signature'].join('.')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StudentHomePage', () => {
  it('mostra o primeiro nome do aluno autenticado', () => {
    setToken(makeIdToken({ name: 'Ana Paula', email: 'ana@example.com' }))

    render(<StudentHomePage />)

    expect(screen.getByRole('heading', { name: 'Oi, Ana' })).toBeInTheDocument()
  })

  it('usa fallback "aluno" quando token não tem nome', () => {
    setToken(makeIdToken({ email: 'sem-nome@example.com' }))

    render(<StudentHomePage />)

    expect(screen.getByRole('heading', { name: 'Oi, aluno' })).toBeInTheDocument()
  })

  it('renderiza cards e navegação principais da home', () => {
    setToken(makeIdToken({ given_name: 'Joao', family_name: 'Silva' }))

    render(<StudentHomePage />)

    expect(screen.getByText('Proxima sessao')).toBeInTheDocument()
    expect(screen.getByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getByText('Julia Ramos')).toBeInTheDocument()
    expect(screen.getAllByText('Buscar')).toHaveLength(2)
    expect(screen.getAllByText('Perfil')).toHaveLength(2)
  })

  it('chama logout de aluno ao clicar em Sair', async () => {
    const logoutSpy = vi.spyOn(cognito, 'logout').mockImplementation(() => {})
    setToken(makeIdToken({ name: 'Ana Paula' }))

    render(<StudentHomePage />)

    await userEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0])

    expect(logoutSpy).toHaveBeenCalledWith('/', 'student')
  })
})
