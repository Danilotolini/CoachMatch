import type { CSSProperties, HTMLAttributes } from 'react'

interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: string
  size?: number
  filled?: boolean
}

export function Icon({ name, size = 24, filled = false, style, className = '', ...props }: IconProps) {
  const variation: CSSProperties = {
    fontSize: size,
    fontVariationSettings: filled
      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    ...style,
  }

  return (
    <span
      {...props}
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={variation}
    >
      {name}
    </span>
  )
}
