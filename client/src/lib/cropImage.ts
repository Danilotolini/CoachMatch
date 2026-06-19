import type { Area } from 'react-easy-crop'

/** Tamanho máximo do lado do quadrado exportado, em pixels. Evita subir originais enormes. */
const MAX_OUTPUT_SIZE = 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => {
      resolve(image)
    })
    image.addEventListener('error', () => {
      reject(new Error('Não foi possível ler a imagem.'))
    })
    image.src = src
  })
}

/**
 * Recorta a área quadrada selecionada no cropper e devolve um `File` 1:1 pronto
 * pro upload. Mantém o tipo (JPEG/PNG/WebP) quando suportado e reaproveita o nome
 * original, já que o fluxo de upload usa `file.name`/`file.type`.
 */
export async function cropToSquareFile(file: File, area: Area): Promise<File> {
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(sourceUrl)
    const side = Math.min(area.width, area.height)
    const output = Math.min(Math.round(side), MAX_OUTPUT_SIZE)

    const canvas = document.createElement('canvas')
    canvas.width = output
    canvas.height = output
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível para recorte.')

    ctx.drawImage(image, area.x, area.y, side, side, 0, 0, output, output)

    const type = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, 0.9)
    })
    if (!blob) throw new Error('Falha ao gerar a imagem recortada.')

    return new File([blob], file.name, { type })
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
