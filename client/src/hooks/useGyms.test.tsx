import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGyms, useGymSearch, useSuggestGym } from './useGyms'
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

  it('filtra por busca de nome (useGymSearch)', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGymSearch('smart'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.every((g) => g.name.toLowerCase().includes('smart'))).toBe(
      true,
    )
  })

  it('filtra por cidade exata', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useGyms('São Paulo'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.every((g) => g.city === 'São Paulo')).toBe(true)
  })
})

describe('useSuggestGym', () => {
  const input = {
    name: 'Academia Nova',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    state: 'sp',
    neighborhood: 'Bela Vista',
  }

  it('envia a sugestão e retorna a academia criada com coordenadas nulas', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSuggestGym(), { wrapper })

    result.current.mutate(input)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toMatchObject({
      name: 'Academia Nova',
      state: 'SP',
      coordinates: null,
    })
  })
})
