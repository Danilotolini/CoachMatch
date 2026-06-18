import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('permite editar modalidades e aplicar', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    render(
      <FilterSheet
        open
        filters={{ specialties: ['Yoga'] }}
        onClose={vi.fn()}
        onApply={onApply}
        onClear={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Pilates' }))
    await user.click(screen.getByRole('button', { name: 'Yoga' }))
    await user.click(screen.getByRole('button', { name: 'APLICAR' }))

    expect(onApply).toHaveBeenCalledWith({
      specialties: ['Pilates'],
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
