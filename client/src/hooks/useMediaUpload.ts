import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { fetchUploadUrl, uploadToS3, type UploadRole } from '@/api/upload'

interface MediaUploadOptions {
  role?: UploadRole
  fallbackContentType?: string
}

/**
 * Upload genérico de mídia: pega a presigned URL no endpoint do papel, envia o
 * arquivo direto ao S3 e retorna a `key` persistível. Serve foto e vídeo — o mesmo
 * endpoint (`/coach/upload-url` ou `/student/upload-url`) aceita ambos.
 */
export function useMediaUpload({
  role = 'coach',
  fallbackContentType = 'application/octet-stream',
}: MediaUploadOptions = {}) {
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const contentType = file.type || fallbackContentType
      const { upload, key } = await fetchUploadUrl(file.name, contentType, role)
      setProgress(0)
      await uploadToS3(upload.url, upload.fields, file, setProgress)
      return key
    },
    onSettled: () => {
      setProgress(0)
    },
  })

  return { ...mutation, progress }
}

export function useVideoUpload(role: UploadRole = 'coach') {
  return useMediaUpload({ role, fallbackContentType: 'video/mp4' })
}

export function usePhotoUpload(role: UploadRole = 'coach') {
  return useMediaUpload({ role, fallbackContentType: 'image/jpeg' })
}
