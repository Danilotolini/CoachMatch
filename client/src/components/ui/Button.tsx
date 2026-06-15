import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '@/components/ui/Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
  icon?: string
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-headline font-bold text-sm uppercase tracking-wide py-4 px-6 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-linear-to-r from-primary to-primary-container text-on-primary-fixed shadow-[0_10px_30px_rgba(244,255,198,0.15)] hover:shadow-[0_10px_40px_rgba(244,255,198,0.25)] hover:brightness-105',
    secondary:
      'bg-surface-container-high border border-outline-variant/30 text-on-surface hover:border-primary/50',
    ghost: 'bg-transparent text-primary hover:bg-primary/10',
  }

  return (
    <button
      {...props}
      disabled={(disabled ?? false) || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : null}
      {children}
      {!loading && icon ? <Icon name={icon} size={20} /> : null}
    </button>
  )
}
