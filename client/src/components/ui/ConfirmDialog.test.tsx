import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renderiza dialogo primario com descricao e permite fechar', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        title="Confirmar ação"
        description="Essa ação altera a agenda."
        confirmLabel="Confirmar"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('alertdialog')).toHaveAttribute(
      'aria-describedby',
      'confirm-dialog-description',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('renderiza estado de perigo e ocupado sem descricao', () => {
    render(
      <ConfirmDialog
        title="Excluir sessão"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        tone="danger"
        busy
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('alertdialog')).not.toHaveAttribute('aria-describedby')
    expect(screen.getByRole('button', { name: 'AGUARDE…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})
