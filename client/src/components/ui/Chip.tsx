interface ChipProps {
  label: string
  active?: boolean
  onRemove?: () => void
  onClick?: () => void
}

export function Chip({ label, active = false, onRemove, onClick }: ChipProps) {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-primary text-on-primary-fixed font-label text-xs font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-[0_0_15px_rgba(244,255,198,0.15)]"
      >
        {label}
        {onRemove ? (
          <span
            role="button"
            aria-label={`Remover ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="material-symbols-outlined text-[14px] cursor-pointer"
          >
            close
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-4 py-2 rounded-full bg-surface-container-highest text-on-surface-variant font-label text-xs font-bold uppercase tracking-widest hover:text-on-surface transition-colors"
    >
      {label}
    </button>
  )
}
