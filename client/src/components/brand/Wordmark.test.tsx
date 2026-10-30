import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wordmark } from './Wordmark'

describe('Wordmark', () => {
  it('renderiza o nome da marca', () => {
    render(<Wordmark />)
    expect(screen.getByText('CoachMatch')).toBeInTheDocument()
  })

  it('aceita className extra', () => {
    render(<Wordmark className="text-2xl" />)
    expect(screen.getByText('CoachMatch').className).toContain('text-2xl')
  })
})
