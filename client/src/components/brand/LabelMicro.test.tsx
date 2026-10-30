import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LabelMicro } from './LabelMicro'

describe('LabelMicro', () => {
  it('renderiza o texto filho', () => {
    render(<LabelMicro>Sessão</LabelMicro>)
    expect(screen.getByText('Sessão')).toBeInTheDocument()
  })

  it('aceita className extra', () => {
    render(<LabelMicro className="opacity-50">Meta</LabelMicro>)
    expect(screen.getByText('Meta').className).toContain('opacity-50')
  })
})
