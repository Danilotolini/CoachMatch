import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Eyebrow } from './Eyebrow'

describe('Eyebrow', () => {
  it('renderiza o texto filho', () => {
    render(<Eyebrow>Destaque</Eyebrow>)
    expect(screen.getByText('Destaque')).toBeInTheDocument()
  })

  it('aceita className extra', () => {
    render(<Eyebrow className="text-red-500">Label</Eyebrow>)
    expect(screen.getByText('Label').className).toContain('text-red-500')
  })
})
