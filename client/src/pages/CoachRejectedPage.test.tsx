import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import CoachRejectedPage from './CoachRejectedPage'

describe('CoachRejectedPage', () => {
  it('renderiza título e link de voltar', () => {
    render(
      <MemoryRouter>
        <CoachRejectedPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Reprovado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/i })).toHaveAttribute('href', '/')
  })
})
