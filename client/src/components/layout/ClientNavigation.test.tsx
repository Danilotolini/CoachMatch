import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ClientBottomNav, ClientSideNav } from './ClientNavigation'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('ClientNavigation', () => {
  beforeEach(() => {
    navigate.mockClear()
  })

  it('renderiza apenas rotas reais do aluno', () => {
    render(
      <MemoryRouter initialEntries={['/client/search']}>
        <ClientSideNav />
        <ClientBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Início')).toHaveLength(2)
    expect(screen.getAllByText('Buscar')).toHaveLength(2)
    expect(screen.getAllByText('Agenda')).toHaveLength(2)
    expect(screen.getAllByText('Perfil')).toHaveLength(2)
    expect(screen.queryByText('Favoritos')).not.toBeInTheDocument()
  })

  it('marca a rota ativa com aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/client/schedule']}>
        <ClientBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /Agenda/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: /Buscar/i })).not.toHaveAttribute('aria-current')
  })

  it('navega para o path do item clicado', async () => {
    render(
      <MemoryRouter initialEntries={['/client']}>
        <ClientBottomNav />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Perfil/i }))

    expect(navigate).toHaveBeenCalledWith('/client/profile')
  })
})
