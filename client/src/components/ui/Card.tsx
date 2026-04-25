import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`bg-surface-container-low rounded-xl border border-outline-variant/10 ${className}`}
    >
      {children}
    </div>
  )
}
