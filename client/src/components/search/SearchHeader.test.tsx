import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchHeader } from './SearchHeader'

describe('SearchHeader', () => {
  it('renderiza o campo de busca com o valor atual', () => {
    render(<SearchHeader type="search" value="marcos" onChange={vi.fn()} onOpenFilters={vi.fn()} />)
    expect(screen.getByRole('searchbox')).toHaveValue('marcos')
  })

  it('chama onChange ao digitar', async () => {
    const onChange = vi.fn()
    render(<SearchHeader type="search" value="" onChange={onChange} onOpenFilters={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('chama onOpenFilters ao clicar no botão de filtros', async () => {
    const onOpenFilters = vi.fn()
    render(<SearchHeader type="search" value="" onChange={vi.fn()} onOpenFilters={onOpenFilters} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir filtros avançados' }))
    expect(onOpenFilters).toHaveBeenCalledTimes(1)
  })
})
