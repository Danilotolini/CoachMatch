import { apiPost } from '@/lib/http'
import type { UploadUrlResponse } from '@/types/api'

export function fetchUploadUrl(filename: string, contentType: string) {
  return apiPost<UploadUrlResponse>('/upload-url', { filename, contentType })
}

export function uploadToS3(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      form.append(k, v)
    })
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`S3 upload failed: ${String(xhr.status)}`))
    })
    xhr.addEventListener('error', () => {
      reject(new Error('S3 upload network error'))
    })
    xhr.send(form)
  })
}
