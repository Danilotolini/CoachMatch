import { useCallback, useState } from 'react'
import { PhotoCropModal } from '@/components/media/PhotoCropModal'

interface PendingCrop {
  file: File
  /** Object URL do arquivo cru; criada e revogada aqui (fora de efeito) para
   *  sobreviver ao monta/desmonta/remonta do StrictMode sem quebrar a imagem. */
  url: string
}

/**
 * Intercala o recorte quadrado entre a seleção do arquivo e o upload. As páginas
 * chamam `requestCrop(file)` no `onChange` do input e renderizam `cropModal`; ao
 * confirmar, `onCropped` recebe o `File` já 1:1 e segue com o fluxo de upload.
 */
export function usePhotoCrop(onCropped: (file: File) => void) {
  const [pending, setPending] = useState<PendingCrop | null>(null)

  const requestCrop = useCallback((picked: File) => {
    setPending({ file: picked, url: URL.createObjectURL(picked) })
  }, [])

  const close = useCallback(() => {
    if (pending) URL.revokeObjectURL(pending.url)
    setPending(null)
  }, [pending])

  const cropModal = pending ? (
    <PhotoCropModal
      file={pending.file}
      imageUrl={pending.url}
      onCancel={close}
      onConfirm={(cropped) => {
        close()
        onCropped(cropped)
      }}
    />
  ) : null

  return { requestCrop, cropModal }
}
