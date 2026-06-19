import { Icon } from '@/components/ui/Icon'

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Modal de confirmação no padrão bottom-sheet (mobile) / centralizado (desktop).
 * Substitui `window.confirm` mantendo a estética editorial do produto.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'VOLTAR',
  tone = 'primary',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-error-container text-on-error-container hover:brightness-110'
      : 'bg-primary text-on-primary-fixed hover:brightness-110'

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface/70 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
        disabled={busy}
      />
      <div
        className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-xl border border-outline-variant/10 bg-surface-container p-5 shadow-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        {...(description ? { 'aria-describedby': 'confirm-dialog-description' } : {})}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger'
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <Icon name={tone === 'danger' ? 'warning' : 'help'} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="font-headline text-lg font-semibold tracking-tight text-on-surface"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-1 font-label text-sm text-on-surface-variant"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40 ${confirmClass}`}
          >
            {busy ? 'AGUARDE…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
