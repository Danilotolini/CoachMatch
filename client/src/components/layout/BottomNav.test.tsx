import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('renderiza os 4 tabs com labels corretas', () => {
    render(<BottomNav active="browse" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Explorar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Treinos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Agenda/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Perfil/i })).toBeInTheDocument()
  })

  it('marca o tab ativo com aria-current="page"', () => {
    render(<BottomNav active="agenda" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Agenda/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: /Explorar/i })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('dispara onChange com o id do tab clicado', async () => {
    const onChange = vi.fn()
    render(<BottomNav active="browse" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /Treinos/i }))

    expect(onChange).toHaveBeenCalledWith('workouts')
  })
})
