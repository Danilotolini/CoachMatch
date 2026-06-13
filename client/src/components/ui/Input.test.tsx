import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

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
})
