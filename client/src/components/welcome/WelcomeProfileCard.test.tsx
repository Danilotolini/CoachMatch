import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { WelcomeProfileCard } from './WelcomeProfileCard'

const mockNavigate = vi.fn()

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('WelcomeProfileCard', () => {
  it('renderiza badge opcional e navega ao clicar', () => {
    render(
      <MemoryRouter>
        <WelcomeProfileCard
          title="Aluno"
          description="Encontre um treinador"
          icon="search"
          to="/client/login"
          badge="Novo"
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /aluno novo encontre um treinador/i }))

    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(mockNavigate).toHaveBeenCalledWith('/client/login')
  })

  it('renderiza sem badge quando ele não é informado', () => {
    render(
      <MemoryRouter>
        <WelcomeProfileCard
          title="Coach"
          description="Ative seu perfil"
          icon="fitness_center"
          to="/coach/login"
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Novo')).not.toBeInTheDocument()
    expect(screen.getByText('Ative seu perfil')).toBeInTheDocument()
  })
})
