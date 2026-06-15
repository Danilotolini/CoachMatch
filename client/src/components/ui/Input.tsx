import { useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string | undefined
  error?: string | undefined
  helpText?: string | undefined
  icon?: string | undefined
  prefix?: string | undefined
  /**
   * Sanitizador aplicado ao valor pelo pai (ex.: máscara/uppercase). Quando
   * informado, o caret é preservado após a transformação, evitando que ele
   * salte para o fim quando o valor digitado é alterado.
   */
  transform?: ((raw: string) => string) | undefined
}

export function Input({
  label,
  error,
  helpText,
  icon,
  prefix,
  transform,
  disabled,
  className = '',
  id,
  onChange,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const inputRef = useRef<HTMLInputElement>(null)
  const caretRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = inputRef.current
    if (el && caretRef.current !== null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current)
    }
    caretRef.current = null
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (transform) {
      const { value, selectionStart } = event.target
      const caret = selectionStart ?? value.length
      caretRef.current = transform(value.slice(0, caret)).length
    }
    onChange?.(event)
  }

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
          ref={inputRef}
          onChange={handleChange}
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
