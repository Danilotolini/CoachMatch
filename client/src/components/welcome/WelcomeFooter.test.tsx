import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeFooter } from './WelcomeFooter'

describe('WelcomeFooter', () => {
  it('renderiza os links de rodapé', () => {
    render(<WelcomeFooter />)
    expect(screen.getByText('Termos de Uso')).toBeInTheDocument()
    expect(screen.getByText('Privacidade')).toBeInTheDocument()
    expect(screen.getByText('Suporte')).toBeInTheDocument()
  })

  it('renderiza o copyright', () => {
    render(<WelcomeFooter />)
    expect(screen.getByText(/COACHMATCH/)).toBeInTheDocument()
  })
})
