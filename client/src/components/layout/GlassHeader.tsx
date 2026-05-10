import type { ReactNode } from 'react'

interface GlassHeaderProps {
  children: ReactNode
  sticky?: boolean
  className?: string
}

export function GlassHeader({ children, sticky = true, className = '' }: GlassHeaderProps) {
  return (
    <header
      className={`${sticky ? 'sticky top-0' : ''} z-50 glass-header flex items-center justify-between px-[18px] py-3 ${className}`}
    >
      {children}
    </header>
  )
}
