import type { InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string | undefined
  error?: string | undefined
  helpText?: string | undefined
  icon?: string | undefined
  prefix?: string | undefined
}

export function Input({
  label,
  error,
  helpText,
  icon,
  prefix,
  disabled,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  const borderColor = error
    ? 'border-error'
    : disabled
      ? 'border-primary/30'
      : 'border-surface-variant focus-within:border-primary'

  return (
    <div className="space-y-2">
      {label ? (
        <label
          htmlFor={inputId}
          className="block font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider"
        >
          {label}
        </label>
      ) : null}

      <div
        className={`bg-surface-container-highest rounded-t-lg border-b ${borderColor} transition-colors p-3 flex items-center`}
      >
        {icon ? (
          <span className="material-symbols-outlined text-on-surface-variant mr-3 select-none">
            {icon}
          </span>
        ) : null}
        {prefix ? (
          <span className="text-on-surface-variant mr-2 font-medium select-none">{prefix}</span>
        ) : null}
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          className={`bg-transparent border-none w-full text-on-surface font-body focus:ring-0 focus:outline-none p-0 placeholder-on-surface-variant/50 ${disabled ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
        />
      </div>

      {error ? (
        <p className="font-body text-xs text-error">{error}</p>
      ) : helpText ? (
        <p className="font-body text-xs text-on-surface-variant">{helpText}</p>
      ) : null}
    </div>
  )
}
