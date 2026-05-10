import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import RejectedPage from './RejectedPage'

describe('RejectedPage', () => {
  it('renderiza título e link de voltar', () => {
    render(
      <MemoryRouter>
        <RejectedPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Reprovado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/i })).toHaveAttribute('href', '/')
  })
})
