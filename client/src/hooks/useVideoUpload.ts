import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { fetchUploadUrl, uploadToS3 } from '@/api/upload'

const VIDEO_CONTENT_TYPE = 'video/mp4'

export function useVideoUpload() {
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const { upload, key } = await fetchUploadUrl(file.name, VIDEO_CONTENT_TYPE)
      setProgress(0)
      await uploadToS3(upload.url, upload.fields, file, setProgress)
      return key
    },
    onSettled: () => setProgress(0),
  })

  return { ...mutation, progress }
}
