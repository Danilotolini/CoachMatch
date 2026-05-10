import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressHeader } from './ProgressHeader'

describe('ProgressHeader', () => {
  it('renderiza título padrão e etapa atual', () => {
    render(<ProgressHeader currentStep={2} totalSteps={5} />)
    expect(screen.getByText('CoachMatch Pro')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/de 5/)).toBeInTheDocument()
  })

  it('aceita título customizado', () => {
    render(<ProgressHeader currentStep={1} totalSteps={3} title="Onboarding" />)
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('calcula a largura da barra de progresso em porcentagem', () => {
    const { container } = render(<ProgressHeader currentStep={1} totalSteps={4} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement | null
    expect(bar?.style.width).toBe('25%')
  })

  it('chega a 100% no último passo', () => {
    const { container } = render(<ProgressHeader currentStep={3} totalSteps={3} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement | null
    expect(bar?.style.width).toBe('100%')
  })
})
