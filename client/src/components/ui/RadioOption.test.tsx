import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioOption } from './RadioOption'

describe('RadioOption', () => {
  it('renderiza o label e a descrição', () => {
    render(
      <RadioOption
        label="Treino em casa"
        description="Atendimento na sua residência"
        checked={false}
        onChange={() => {}}
      />,
    )

    expect(screen.getByText('Treino em casa')).toBeInTheDocument()
    expect(screen.getByText('Atendimento na sua residência')).toBeInTheDocument()
  })

  it('omite a descrição quando não informada', () => {
    render(<RadioOption label="Online" checked={false} onChange={() => {}} />)
    // Apenas o label deveria estar presente como texto significativo
    expect(screen.queryByText('Atendimento')).not.toBeInTheDocument()
  })

  it('marca o radio quando checked=true', () => {
    render(<RadioOption label="Online" checked onChange={() => {}} />)
    expect(screen.getByRole('radio')).toBeChecked()
    expect(screen.getByText('radio_button_checked')).toBeInTheDocument()
  })

  it('mostra ícone vazio quando não checked', () => {
    render(<RadioOption label="Online" checked={false} onChange={() => {}} />)
    expect(screen.getByRole('radio')).not.toBeChecked()
    expect(screen.getByText('radio_button_unchecked')).toBeInTheDocument()
  })

  it('dispara onChange ao clicar no label', async () => {
    const onChange = vi.fn()
    render(<RadioOption label="Online" checked={false} onChange={onChange} />)

    await userEvent.click(screen.getByText('Online'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
