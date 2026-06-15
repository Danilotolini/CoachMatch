import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { CoachBottomNav, CoachSideNav } from './CoachNavigation'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('CoachNavigation', () => {
  beforeEach(() => {
    navigate.mockClear()
  })

  it('renderiza apenas rotas reais do treinador', () => {
    render(
      <MemoryRouter initialEntries={['/coach']}>
        <CoachSideNav />
        <CoachBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Início')).toHaveLength(2)
    expect(screen.getAllByText('Agenda')).toHaveLength(2)
    expect(screen.getAllByText('Perfil')).toHaveLength(2)
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument()
  })

  it('marca agenda como ativa em rotas de agenda', () => {
    render(
      <MemoryRouter initialEntries={['/coach/schedule']}>
        <CoachBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /Agenda/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: /Início/i })).not.toHaveAttribute('aria-current')
  })

  it('navega para o path do item clicado', async () => {
    render(
      <MemoryRouter initialEntries={['/coach']}>
        <CoachBottomNav />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Perfil/i }))

    expect(navigate).toHaveBeenCalledWith('/coach/profile')
  })
})
