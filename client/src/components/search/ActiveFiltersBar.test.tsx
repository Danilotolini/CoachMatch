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
          address: 'São Paulo',
          specialties: ['Yoga', 'Pilates'],
          priceMin: 120,
          priceMax: 240,
          availableOn: '2026-06-20',
        }}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('Busca: funcional')).toBeInTheDocument()
    expect(screen.getByText('São Paulo')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.getByText('Pilates')).toBeInTheDocument()
    expect(screen.getByText('De R$ 120')).toBeInTheDocument()
    expect(screen.getByText('Até R$ 240')).toBeInTheDocument()
    expect(screen.getByText('2026-06-20')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Remover Busca: funcional'))
    await user.click(screen.getByLabelText('Remover São Paulo'))
    await user.click(screen.getByLabelText('Remover Yoga'))
    await user.click(screen.getByLabelText('Remover De R$ 120'))
    await user.click(screen.getByLabelText('Remover Até R$ 240'))
    await user.click(screen.getByLabelText('Remover 2026-06-20'))

    expect(onRemove.mock.calls).toEqual([
      ['q'],
      ['address'],
      ['specialties', 'Yoga'],
      ['priceMin'],
      ['priceMax'],
      ['availableOn'],
    ])
  })
})
