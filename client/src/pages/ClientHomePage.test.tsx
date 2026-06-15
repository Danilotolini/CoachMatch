import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import ClientHomePage from './ClientHomePage'
import { createWrapper } from '@/test/createWrapper'
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

function renderClientHome(initialEntries = ['/client']) {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryWrapper>
        <ClientHomePage />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('ClientHomePage', () => {
  it('mostra o primeiro nome do aluno autenticado', () => {
    loginAs('client', makeIdToken({ name: 'Ana Paula', email: 'ana@example.com' }))

    renderClientHome()

    expect(screen.getByRole('heading', { name: 'Oi, Ana' })).toBeInTheDocument()
  })

  it('usa fallback "aluno" quando token não tem nome', () => {
    loginAs('client', makeIdToken({ email: 'sem-nome@example.com' }))

    renderClientHome()

    expect(screen.getByRole('heading', { name: 'Oi, aluno' })).toBeInTheDocument()
  })

  it('renderiza cards e navegação principais da home', async () => {
    loginAs('client', makeIdToken({ given_name: 'Joao', family_name: 'Silva' }))

    renderClientHome()

    expect(screen.getByText('Próxima sessão')).toBeInTheDocument()
    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
    expect(await screen.findByText('Priscila Duarte')).toBeInTheDocument()
    expect(screen.getAllByText('Buscar')).toHaveLength(2)
    expect(screen.getAllByText('Perfil')).toHaveLength(2)
  })
})
