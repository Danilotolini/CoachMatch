import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Input } from './Input'

function upper(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z/-]/g, '')
}

function MaskedHarness() {
  const [value, setValue] = useState('123456-G/SP')
  return (
    <Input
      label="Registro CREF"
      value={value}
      transform={upper}
      onChange={(event) => {
        setValue(upper(event.target.value))
      }}
    />
  )
}

describe('Input', () => {
  it('associa label ao input via htmlFor derivado do label', () => {
    render(<Input label="Nome completo" />)

    const input = screen.getByLabelText('Nome completo')
    expect(input).toHaveAttribute('id', 'nome-completo')
  })

  it('respeita id explícito quando informado', () => {
    render(<Input id="meu-id" label="Email" />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'meu-id')
  })

  it('digita valor controlado', async () => {
    const Wrapper = () => {
      // hook simples só para testar digitação
      return <Input label="Cidade" defaultValue="" placeholder="Digite" />
    }
    render(<Wrapper />)

    const input = screen.getByLabelText('Cidade')
    await userEvent.type(input, 'Recife')
    expect(input).toHaveValue('Recife')
  })

  it('mostra mensagem de erro quando informada', () => {
    render(<Input label="Email" error="Email inválido" helpText="Texto de ajuda" />)

    expect(screen.getByText('Email inválido')).toBeInTheDocument()
    // helpText não aparece quando há erro
    expect(screen.queryByText('Texto de ajuda')).not.toBeInTheDocument()
  })

  it('mostra helpText quando não há erro', () => {
    render(<Input label="Email" helpText="Texto de ajuda" />)
    expect(screen.getByText('Texto de ajuda')).toBeInTheDocument()
  })

  it('renderiza prefix e ícone', () => {
    render(<Input label="Telefone" prefix="+55" icon="phone" />)
    expect(screen.getByText('+55')).toBeInTheDocument()
    expect(screen.getByText('phone')).toBeInTheDocument()
  })

  it('aplica disabled corretamente', () => {
    render(<Input label="Bloqueado" disabled />)
    expect(screen.getByLabelText('Bloqueado')).toBeDisabled()
  })

  it('preserva o caret ao transformar o valor (não pula para o fim)', async () => {
    const user = userEvent.setup()
    render(<MaskedHarness />)
    const input = screen.getByLabelText('Registro CREF') as HTMLInputElement

    // Digita uma letra minúscula no meio: o transform a deixa maiúscula,
    // o que antes jogava o caret para o fim.
    input.focus()
    input.setSelectionRange(2, 2)
    await user.keyboard('a')

    expect(input.value).toBe('12A3456-G/SP')
    expect(input.selectionStart).toBe(3)

    // Como o caret ficou no lugar, o backspace apaga o caractere recém-digitado.
    await user.keyboard('{Backspace}')
    expect(input.value).toBe('123456-G/SP')
    expect(input.selectionStart).toBe(2)
  })
})
