import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveFiltersBar } from './ActiveFiltersBar'

describe('ActiveFiltersBar', () => {
  it('não renderiza quando não há filtros ativos', () => {
    const { container } = render(<ActiveFiltersBar filters={{}} onRemove={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza todos os chips e remove cada filtro com a assinatura correta', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    render(
      <ActiveFiltersBar
        filters={{
          q: 'funcional',
          specialties: ['Yoga', 'Pilates'],
        }}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('Busca: funcional')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.getByText('Pilates')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Remover Busca: funcional'))
    await user.click(screen.getByLabelText('Remover Yoga'))
    await user.click(screen.getByLabelText('Remover Pilates'))

    expect(onRemove.mock.calls).toEqual([
      ['q'],
      ['specialties', 'Yoga'],
      ['specialties', 'Pilates'],
    ])
  })
})
