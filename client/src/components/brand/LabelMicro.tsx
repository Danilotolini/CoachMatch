import type { ReactNode } from 'react'

interface LabelMicroProps {
  children: ReactNode
  className?: string
}

export function LabelMicro({ children, className = '' }: LabelMicroProps) {
  return (
    <span
      className={`font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant ${className}`}
    >
      {children}
    </span>
  )
}
