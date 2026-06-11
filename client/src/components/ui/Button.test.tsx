import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renderiza o texto do filho', () => {
    render(<Button>AGENDAR</Button>)
    expect(screen.getByRole('button', { name: 'AGENDAR' })).toBeInTheDocument()
  })

  it('dispara onClick ao ser clicado', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>OK</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'OK' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fica desabilitado e não dispara onClick quando disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        OK
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'OK' })
    expect(button).toBeDisabled()

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('mostra spinner e fica desabilitado quando loading', () => {
    render(<Button loading>SALVAR</Button>)

    const button = screen.getByRole('button', { name: /SALVAR/ })
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renderiza ícone quando não está em loading', () => {
    render(<Button icon="add">CRIAR</Button>)

    const button = screen.getByRole('button', { name: /CRIAR/ })
    expect(button.textContent).toContain('add')
  })

  it('omite o ícone quando loading', () => {
    render(
      <Button icon="add" loading>
        CRIAR
      </Button>,
    )

    const button = screen.getByRole('button', { name: /CRIAR/ })
    expect(button.textContent).not.toContain('add')
  })

  it('aplica classes de variante secundária', () => {
    render(<Button variant="secondary">SEC</Button>)
    const button = screen.getByRole('button', { name: 'SEC' })
    expect(button.className).toContain('bg-surface-container-high')
  })

  it('encaminha className adicional', () => {
    render(<Button className="meu-extra">OK</Button>)
    expect(screen.getByRole('button', { name: 'OK' }).className).toContain('meu-extra')
  })
})
