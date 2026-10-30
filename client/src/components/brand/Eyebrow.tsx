import type { ReactNode } from 'react'

interface EyebrowProps {
  readonly children: ReactNode
  readonly className?: string
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <span
      className={`font-label text-[11px] font-bold uppercase tracking-[0.2em] text-primary ${className}`}
    >
      {children}
    </span>
  )
}
