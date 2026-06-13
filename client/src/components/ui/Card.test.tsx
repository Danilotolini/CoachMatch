import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renderiza children', () => {
    render(
      <Card>
        <p>Conteúdo do card</p>
      </Card>,
    )
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument()
  })

  it('aplica className adicional sem perder as classes base', () => {
    render(
      <Card className="meu-extra" data-testid="card">
        x
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card.className).toContain('meu-extra')
    expect(card.className).toContain('rounded-xl')
  })

  it('encaminha props HTML para o div', () => {
    render(
      <Card data-testid="card" id="card-1" role="region" aria-label="Resumo">
        x
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveAttribute('id', 'card-1')
    expect(card).toHaveAttribute('aria-label', 'Resumo')
  })
})
