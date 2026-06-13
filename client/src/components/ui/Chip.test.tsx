import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('renderiza o label no estado inativo', () => {
    render(<Chip label="Musculação" />)
    expect(screen.getByRole('button', { name: 'Musculação' })).toBeInTheDocument()
  })

  it('dispara onClick ao ser clicado', async () => {
    const onClick = vi.fn()
    render(<Chip label="Yoga" onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: 'Yoga' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('aplica estilos de ativo quando active=true', () => {
    render(<Chip label="Yoga" active />)
    const chip = screen.getByRole('button', { name: 'Yoga' })
    expect(chip.className).toContain('bg-primary')
  })

  it('renderiza botão de remover apenas quando active e onRemove forem informados', () => {
    render(<Chip label="Yoga" active onRemove={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Remover Yoga' })).toBeInTheDocument()
  })

  it('não renderiza botão de remover quando inativo', () => {
    render(<Chip label="Yoga" onRemove={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Remover Yoga' })).not.toBeInTheDocument()
  })

  it('chama onRemove sem disparar onClick do chip', async () => {
    const onClick = vi.fn()
    const onRemove = vi.fn()
    render(<Chip label="Yoga" active onClick={onClick} onRemove={onRemove} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remover Yoga' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })
})
