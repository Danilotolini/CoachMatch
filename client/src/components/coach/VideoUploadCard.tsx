import { Icon } from '@/components/ui/Icon'

interface VideoUploadCardProps {
  label: string
  uploaded: boolean
  uploading: boolean
  progress: number
  fileName: string | null
  error?: string | undefined
  hint?: string | undefined
  onPick: () => void
}

export function VideoUploadCard({
  label,
  uploaded,
  uploading,
  progress,
  fileName,
  error,
  hint,
  onPick,
}: VideoUploadCardProps) {
  const status = uploading
    ? `Enviando... ${String(progress)}%`
    : uploaded
      ? fileName
        ? `Pronto: ${fileName}`
        : 'Vídeo de apresentação publicado.'
      : 'Faça upload de um vídeo curto (até 60s) mostrando sua energia.'

  const icon = uploaded ? 'check_circle' : uploading ? 'progress_activity' : 'videocam'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="group flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-center transition-colors hover:bg-surface-container-highest disabled:cursor-wait"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest transition-colors group-hover:bg-primary/20">
          <Icon name={icon} className={`text-primary ${uploading ? 'animate-spin' : ''}`} />
        </span>
        <span className="font-headline text-sm font-semibold text-on-surface">{label}</span>
        <span className="mt-1 max-w-52 font-body text-xs text-on-surface-variant">{status}</span>
      </button>
      {error ? <p className="font-body text-xs text-error">{error}</p> : null}
      {hint ? <p className="font-body text-xs text-on-surface-variant">{hint}</p> : null}
    </div>
  )
}
