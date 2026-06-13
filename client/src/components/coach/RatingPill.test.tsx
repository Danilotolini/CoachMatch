import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RatingPill } from './RatingPill'

describe('RatingPill', () => {
  it('renderiza o valor numérico', () => {
    render(<RatingPill value={4.8} />)
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('renderiza valor string', () => {
    render(<RatingPill value="5.0" />)
    expect(screen.getByText('5.0')).toBeInTheDocument()
  })

  it('inclui o ícone de estrela', () => {
    const { container } = render(<RatingPill value={4.8} />)
    expect(container.textContent).toContain('star')
  })
})
