import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveFiltersBar } from './ActiveFiltersBar'
import { SearchHeader } from './SearchHeader'
import { SortControl } from './SortControl'

describe('SearchControls', () => {
  it('não renderiza filtros ativos quando não há filtros', () => {
    const { container } = render(<ActiveFiltersBar filters={{}} onRemove={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('remove filtros individuais com chave e valor corretos', async () => {
    const onRemove = vi.fn()
    render(
      <ActiveFiltersBar
        filters={{ q: 'força', address: 'Pinheiros', specialties: ['Funcional'] }}
        onRemove={onRemove}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Remover Busca: força/i }))
    await userEvent.click(screen.getByRole('button', { name: /Remover Funcional/i }))

    expect(onRemove).toHaveBeenNthCalledWith(1, 'q')
    expect(onRemove).toHaveBeenNthCalledWith(2, 'specialties', 'Funcional')
  })

  it('marca a ordenação atual e dispara onChange', async () => {
    const onChange = vi.fn()
    render(<SortControl value="rating" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: /Mais bem avaliados/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await userEvent.click(screen.getByRole('radio', { name: /Menor preço/i }))

    expect(onChange).toHaveBeenCalledWith('price_asc')
  })

  it('atualiza a busca e abre filtros avançados', async () => {
    const onChange = vi.fn()
    const onOpenFilters = vi.fn()
    render(
      <SearchHeader
        type="search"
        value=""
        onChange={onChange}
        onOpenFilters={onOpenFilters}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nome, modalidade ou bairro'), {
      target: { value: 'pilates' },
    })
    await userEvent.click(screen.getByRole('button', { name: /Abrir filtros avançados/i }))

    expect(onChange).toHaveBeenCalledWith('pilates')
    expect(onOpenFilters).toHaveBeenCalledTimes(1)
  })
})
