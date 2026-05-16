import type { CoachSearchSort } from '@/types/api'

const OPTIONS: { value: CoachSearchSort; label: string }[] = [
  { value: 'rating', label: 'Mais bem avaliados' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
]

interface SortControlProps {
  value: CoachSearchSort
  onChange: (value: CoachSearchSort) => void
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div className="grid grid-cols-3 rounded-xl bg-surface-container-low p-1" role="radiogroup" aria-label="Ordenação">
      {OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => { onChange(option.value); }}
            className={`min-h-10 rounded-lg px-2 font-label text-[11px] font-bold uppercase transition-all active:scale-[0.98] ${
              selected
                ? 'bg-primary text-on-primary-fixed'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
