import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterSheet } from './FilterSheet'

const useStudentSpecialtiesMock = vi.fn()

vi.mock('@/hooks/useStudentSpecialties', () => ({
  useStudentSpecialties: () => useStudentSpecialtiesMock(),
}))

describe('FilterSheet', () => {
  beforeEach(() => {
    useStudentSpecialtiesMock.mockReturnValue({
      data: {
        data: [
          { id: 'YOGA', label: 'Yoga' },
          { id: 'PILATES', label: 'Pilates' },
        ],
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('não renderiza quando está fechado', () => {
    const { container } = render(
      <FilterSheet
        open={false}
        filters={{}}
        onClose={vi.fn()}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('permite editar filtros e aplicar com page resetada', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const realDate = Date

    vi.stubGlobal(
      'Date',
      class extends realDate {
        constructor(value?: string | number | Date) {
          super(value ?? '2026-06-15T12:00:00Z')
        }
        static now() {
          return new realDate('2026-06-15T12:00:00Z').getTime()
        }
      } as DateConstructor,
    )

    const { container } = render(
      <FilterSheet
        open
        filters={{ address: 'Campinas', specialties: ['Yoga'], page: 4 }}
        onClose={vi.fn()}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    )

    const locationInput = screen.getByPlaceholderText('Localização')
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
    expect(screen.getByDisplayValue('Campinas')).toBeInTheDocument()
    expect(dateInput).toHaveAttribute('min', '2026-06-15')

    await user.clear(locationInput)
    await user.type(locationInput, 'São Paulo')
    await user.click(screen.getByRole('button', { name: 'Pilates' }))
    await user.click(screen.getByRole('button', { name: 'Yoga' }))
    fireEvent.change(dateInput, { target: { value: '2026-06-20' } })
    await user.click(screen.getByRole('button', { name: 'APLICAR' }))

    expect(onApply).toHaveBeenCalledWith({
      address: 'São Paulo',
      specialties: ['Pilates'],
      page: 1,
      availableOn: '2026-06-20',
    })
  })

  it('dispara clear e close', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    const onClose = vi.fn()

    render(<FilterSheet open filters={{}} onClose={onClose} onApply={vi.fn()} onClear={onClear} />)

    await user.click(screen.getByRole('button', { name: 'LIMPAR FILTROS' }))
    await user.click(screen.getByLabelText('Fechar'))
    await user.click(screen.getByLabelText('Fechar filtros'))

    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
