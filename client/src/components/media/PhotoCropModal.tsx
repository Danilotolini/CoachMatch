import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Icon } from '@/components/ui/Icon'
import { cropToSquareFile } from '@/lib/cropImage'

interface PhotoCropModalProps {
  /** Arquivo cru escolhido pelo usuário, antes do recorte. */
  file: File
  /** Object URL do arquivo; o ciclo de vida (criar/revogar) é do `usePhotoCrop`. */
  imageUrl: string
  onCancel: () => void
  /** Recebe o `File` já recortado em 1:1, pronto pro upload. */
  onConfirm: (cropped: File) => void
}

/**
 * Modal de recorte: força a foto de perfil a ser quadrada (1:1). O usuário
 * arrasta e dá zoom; ao confirmar, geramos um `File` quadrado via canvas e
 * devolvemos pra quem chamou seguir com o upload existente.
 */
export function PhotoCropModal({ file, imageUrl, onCancel, onConfirm }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setArea(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!area) return
    setProcessing(true)
    setError(null)
    try {
      const cropped = await cropToSquareFile(file, area)
      onConfirm(cropped)
    } catch {
      setError('Não foi possível recortar a imagem. Tente outra foto.')
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface/70 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onCancel}
      />
      <div
        className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-xl border border-outline-variant/10 bg-surface-container p-5 shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-crop-title"
      >
        <div className="min-w-0">
          <h2
            id="photo-crop-title"
            className="font-headline text-lg font-semibold tracking-tight text-on-surface"
          >
            Ajustar foto
          </h2>
          <p className="mt-1 font-label text-xs text-on-surface-variant">
            Arraste e use o zoom para enquadrar. A foto fica quadrada.
          </p>
        </div>

        <div className="relative h-64 w-full overflow-hidden rounded-xl bg-surface-container-highest">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <label className="flex items-center gap-3">
          <Icon name="zoom_out" size={18} className="text-on-surface-variant" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(event) => {
              setZoom(Number(event.target.value))
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-container-highest accent-primary"
          />
          <Icon name="zoom_in" size={18} className="text-on-surface-variant" />
        </label>

        {error ? <p className="font-body text-xs text-error">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-lg px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm()
            }}
            disabled={processing || !area}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-on-primary-fixed transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {processing ? (
              <Icon name="progress_activity" size={16} className="animate-spin" />
            ) : (
              <Icon name="check" size={16} />
            )}
            {processing ? 'Processando' : 'Usar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
