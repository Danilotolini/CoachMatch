import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlassHeader } from './GlassHeader'

describe('GlassHeader', () => {
  it('renderiza os filhos dentro do header', () => {
    render(<GlassHeader><span>Logo</span></GlassHeader>)
    expect(screen.getByText('Logo')).toBeInTheDocument()
  })

  it('aplica sticky por padrão', () => {
    const { container } = render(<GlassHeader>X</GlassHeader>)
    const header = container.querySelector('header')
    expect(header?.className).toContain('sticky')
  })

  it('não aplica sticky quando sticky=false', () => {
    const { container } = render(<GlassHeader sticky={false}>X</GlassHeader>)
    const header = container.querySelector('header')
    expect(header?.className).not.toContain('sticky')
  })

  it('aceita className extra', () => {
    const { container } = render(<GlassHeader className="px-8">X</GlassHeader>)
    expect(container.querySelector('header')?.className).toContain('px-8')
  })
})
