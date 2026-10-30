import type { ReactNode } from 'react'

interface GlassHeaderProps {
  readonly children: ReactNode
  readonly sticky?: boolean
  readonly className?: string
}

export function GlassHeader({ children, sticky = true, className = '' }: GlassHeaderProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0' : ''} z-50 glass-header flex items-center justify-between px-4.5 py-3 ${className}`}
    >
      {children}
    </header>
  )
}
