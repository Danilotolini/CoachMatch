import { Icon } from '@/components/ui/Icon'

interface PhotoUploadCardProps {
  label: string
  previewUrl: string | null
  uploading: boolean
  progress: number
  error?: string | undefined
  hint?: string | undefined
  onPick: () => void
}

export function PhotoUploadCard({
  label,
  previewUrl,
  uploading,
  progress,
  error,
  hint,
  onPick,
}: PhotoUploadCardProps) {
  const status = uploading
    ? `Enviando... ${String(progress)}%`
    : previewUrl
      ? 'Foto de perfil pronta.'
      : 'Use uma foto nítida do rosto, boa iluminação e fundo neutro.'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="group flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-center transition-colors hover:bg-surface-container-highest disabled:cursor-wait"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Pré-visualização da foto de perfil"
            className="mb-3 h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest transition-colors group-hover:bg-primary/20">
            <Icon
              name={uploading ? 'progress_activity' : 'add_a_photo'}
              className={`text-primary ${uploading ? 'animate-spin' : ''}`}
            />
          </span>
        )}
        <span className="font-headline text-sm font-semibold text-on-surface">{label}</span>
        <span className="mt-1 max-w-52 font-body text-xs text-on-surface-variant">{status}</span>
      </button>
      {error ? <p className="font-body text-xs text-error">{error}</p> : null}
      {hint ? <p className="font-body text-xs text-on-surface-variant">{hint}</p> : null}
    </div>
  )
}
