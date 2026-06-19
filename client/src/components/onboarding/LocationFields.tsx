import { useEffect, useMemo, useRef, useState } from 'react'

interface CityAutocompleteProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  disabled?: boolean
}

export function CityAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const nq = normalize(q)
    if (!nq) return options.slice(0, 50)
    return options.filter((opt) => normalize(opt).includes(nq)).slice(0, 50)
  }, [options, query])

  const select = (city: string) => {
    onChange(city)
    setQuery(city)
    setOpen(false)
  }

  return (
    <div>
      <label className="block font-label text-xs text-on-surface-variant mb-2">Cidade</label>
      <div ref={containerRef} className="relative">
        <div className="bg-surface-container-highest rounded-lg border border-outline-variant/15 focus-within:border-primary/50 transition-colors flex items-center px-4">
          <span className="material-symbols-outlined text-on-surface-variant mr-2 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              const nextValue = e.target.value
              setQuery(nextValue)
              onChange(nextValue)
              setOpen(true)
              setHighlight(0)
            }}
            onFocus={() => {
              setOpen(true)
            }}
            onKeyDown={(e) => {
              if (!open) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight((h) => Math.min(h + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight((h) => Math.max(h - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[highlight]) select(filtered[highlight])
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            className="w-full bg-transparent border-none py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none disabled:opacity-50"
          />
        </div>
        {open && !disabled && filtered.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg bg-surface-container-high border border-outline-variant/20 shadow-lg">
            {filtered.map((city, idx) => (
              <li key={city}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    select(city)
                  }}
                  onMouseEnter={() => {
                    setHighlight(idx)
                  }}
                  className={`w-full text-left px-4 py-2 font-body text-sm transition-colors ${
                    idx === highlight
                      ? 'bg-primary/15 text-on-surface'
                      : 'text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {open && !disabled && query.trim() && filtered.length === 0 ? (
          <div className="absolute z-10 mt-1 w-full rounded-lg bg-surface-container-high border border-outline-variant/20 shadow-lg px-4 py-3 font-body text-xs text-on-surface-variant">
            Nenhuma cidade encontrada.
          </div>
        ) : null}
      </div>
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block font-label text-xs text-on-surface-variant mb-2">{label}</label>
      <div className="bg-surface-container-highest rounded-lg border border-outline-variant/15 focus-within:border-primary/50 transition-colors">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          disabled={disabled}
          className="w-full bg-transparent border-none px-4 py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
