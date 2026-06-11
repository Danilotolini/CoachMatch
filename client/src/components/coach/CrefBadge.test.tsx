import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrefBadge } from './CrefBadge'

describe('CrefBadge', () => {
  it('renderiza o texto CREF e ícone verified', () => {
    const { container } = render(<CrefBadge />)
    expect(screen.getByText('CREF')).toBeInTheDocument()
    expect(container.textContent).toContain('verified')
  })
})
