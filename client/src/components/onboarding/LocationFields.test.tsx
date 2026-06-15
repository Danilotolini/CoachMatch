import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CityAutocomplete, SelectField } from './LocationFields'

describe('CityAutocomplete', () => {
  const options = ['São Paulo', 'Santos', 'Campinas']

  it('filtra cidades, navega por teclado e seleciona o item destacado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CityAutocomplete
        value=""
        onChange={onChange}
        options={options}
        placeholder="Selecione a cidade"
      />,
    )

    const input = screen.getByPlaceholderText('Selecione a cidade')
    await user.type(input, 'sao')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenLastCalledWith('São Paulo')
    expect(screen.queryByRole('button', { name: 'São Paulo' })).not.toBeInTheDocument()
  })

  it('mostra estado vazio, fecha com escape e ignora dropdown quando disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(
      <CityAutocomplete value="" onChange={onChange} options={options} placeholder="Cidade" />,
    )

    const input = screen.getByPlaceholderText('Cidade')
    await user.type(input, 'xyz')
    expect(screen.getByText('Nenhuma cidade encontrada.')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Nenhuma cidade encontrada.')).not.toBeInTheDocument()

    rerender(
      <CityAutocomplete
        value=""
        onChange={onChange}
        options={options}
        placeholder="Cidade"
        disabled
      />,
    )

    await user.click(screen.getByPlaceholderText('Cidade'))
    expect(screen.queryByRole('button', { name: 'São Paulo' })).not.toBeInTheDocument()
  })

  it('fecha ao clicar fora e permite seleção com mouse', async () => {
    const onChange = vi.fn()

    render(
      <div>
        <CityAutocomplete value="" onChange={onChange} options={options} placeholder="Cidade" />
        <button type="button">fora</button>
      </div>,
    )

    const input = screen.getByPlaceholderText('Cidade')
    fireEvent.focus(input)
    expect(screen.getByRole('button', { name: 'São Paulo' })).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByText('fora'))
    expect(screen.queryByRole('button', { name: 'São Paulo' })).not.toBeInTheDocument()

    fireEvent.focus(input)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Campinas' }))
    expect(onChange).toHaveBeenLastCalledWith('Campinas')
  })
})

describe('SelectField', () => {
  it('renderiza placeholder e propaga mudanças', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SelectField
        label="Estado"
        value=""
        onChange={onChange}
        options={[
          { value: 'SP', label: 'São Paulo' },
          { value: 'RJ', label: 'Rio de Janeiro' },
        ]}
        placeholder="Selecione"
      />,
    )

    expect(screen.getByText('Selecione')).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox'), 'RJ')
    expect(onChange).toHaveBeenCalledWith('RJ')
  })
})
