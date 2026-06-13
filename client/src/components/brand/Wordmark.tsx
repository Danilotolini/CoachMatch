interface WordmarkProps {
  className?: string
}

export function Wordmark({ className = '' }: WordmarkProps) {
  return (
    <span
      className={`font-headline font-extrabold uppercase tracking-[-0.04em] leading-none text-primary ${className}`}
    >
      CoachMatch
    </span>
  )
}
