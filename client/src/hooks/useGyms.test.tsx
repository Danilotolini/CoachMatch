import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGyms } from './useGyms'
import { createWrapper } from '@/test/createWrapper'
import { clearAllSessions, loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('coach')
})

describe('useGyms', () => {
  it('lista academias quando há token', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGyms(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.length).toBeGreaterThan(0)
  })

  it('fica idle sem token', () => {
    clearAllSessions()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGyms(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('filtra por busca de nome', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGyms('smart'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.every((g) => g.name.toLowerCase().includes('smart'))).toBe(
      true,
    )
  })

  it('filtra por cidade exata', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGyms(undefined, 'São Paulo'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.every((g) => g.city === 'São Paulo')).toBe(true)
  })
})
