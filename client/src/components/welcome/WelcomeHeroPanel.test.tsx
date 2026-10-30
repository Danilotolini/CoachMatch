import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeHeroPanel } from './WelcomeHeroPanel'

describe('WelcomeHeroPanel', () => {
  it('renderiza a imagem do herói', () => {
    render(<WelcomeHeroPanel />)
    expect(screen.getByRole('img', { name: 'Atleta em movimento' })).toBeInTheDocument()
  })

  it('renderiza o nome da marca', () => {
    render(<WelcomeHeroPanel />)
    expect(screen.getByText('CoachMatch')).toBeInTheDocument()
  })

  it('renderiza o headline', () => {
    render(<WelcomeHeroPanel />)
    expect(screen.getByText(/Performance Editorial/i)).toBeInTheDocument()
  })
})
