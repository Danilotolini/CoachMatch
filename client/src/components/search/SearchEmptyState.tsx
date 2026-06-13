import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface SearchEmptyStateProps {
  onClear: () => void
}

export function SearchEmptyState({ onClear }: SearchEmptyStateProps) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-low px-6 py-10 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-primary">
        <Icon name="manage_search" size={34} />
      </div>
      <h2 className="font-headline text-xl font-semibold">
        Nenhum treinador encontrado pra esses filtros
      </h2>
      <p className="mt-2 max-w-sm font-body text-sm text-on-surface-variant">
        Ajuste modalidade, bairro ou preço para abrir novas combinações.
      </p>
      <Button type="button" variant="secondary" onClick={onClear} className="mt-6">
        LIMPAR FILTROS
      </Button>
    </div>
  )
}
