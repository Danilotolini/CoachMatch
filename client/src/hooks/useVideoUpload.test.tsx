import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useVideoUpload } from './useVideoUpload'
import { server } from '@/mocks/server'
import { setToken } from '@/lib/auth'
import { createWrapper } from '@/test/createWrapper'

const MOCK_S3_URL = 'https://mock-s3.local/upload'

function makeFile(name = 'video.mp4'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'video/mp4' })
}

beforeEach(() => {
  setToken('fake-jwt')
})

describe('useVideoUpload', () => {
  it('busca a presigned URL, envia ao S3 e retorna a key', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useVideoUpload(), { wrapper })

    let key: string | undefined
    await act(async () => {
      key = await result.current.mutateAsync(makeFile('intro.mp4'))
    })

    expect(key).toMatch(/^uploads\/.*intro\.mp4$/)
  })

  it('zera o progresso ao finalizar (onSettled)', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useVideoUpload(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(makeFile())
    })

    await waitFor(() => {
      expect(result.current.progress).toBe(0)
    })
  })

  it('propaga erro quando o /upload-url falha', async () => {
    server.use(
      http.post('*/upload-url', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useVideoUpload(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync(makeFile())
      }),
    ).rejects.toThrow()
  })

  it('propaga erro quando o upload pro S3 falha', async () => {
    server.use(http.post(MOCK_S3_URL, () => new HttpResponse(null, { status: 500 })))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useVideoUpload(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync(makeFile())
      }),
    ).rejects.toThrow(/S3 upload failed/)
  })
})
