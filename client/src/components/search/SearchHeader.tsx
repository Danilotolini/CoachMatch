import { Icon } from '@/components/ui/Icon'

interface SearchHeaderProps {
  type: string
  value: string
  onChange: (value: string) => void
  onOpenFilters: () => void
}

export function SearchHeader({ type, value, onChange, onOpenFilters }: SearchHeaderProps) {
  return (
    <section className="flex items-center gap-2 rounded-full border border-outline-variant/20 bg-surface-container-highest px-4 py-3 transition-colors focus-within:border-primary/40">
      <Icon name="search" size={20} className="shrink-0 text-on-surface-variant" />
      <input
        type={type}
        value={value}
        onChange={(event) => { onChange(event.target.value); }}
        placeholder="Nome, modalidade ou bairro"
        aria-label="Nome, modalidade ou bairro"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-0"
      />
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros avançados"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 active:scale-95"
      >
        <Icon name="tune" size={20} />
      </button>
    </section>
  )
}
