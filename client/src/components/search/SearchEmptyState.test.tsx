import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchEmptyState } from '@/components/search/SearchEmptyState'

describe('SearchEmptyState', () => {
  it('chama ação para limpar filtros', async () => {
    const onClear = vi.fn()

    render(<SearchEmptyState onClear={onClear} />)

    await userEvent.click(screen.getByRole('button', { name: 'LIMPAR FILTROS' }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
