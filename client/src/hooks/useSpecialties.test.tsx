import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useSpecialties } from './useSpecialties'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { clearAllSessions, loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('coach')
})

describe('useSpecialties', () => {
  it('busca a lista paginada quando há token', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSpecialties(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.length).toBeGreaterThan(0)
    expect(result.current.data?.data[0]).toHaveProperty('label')
  })

  it('fica desabilitada (não dispara query) quando não há token', () => {
    clearAllSessions()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSpecialties(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('encaminha o parâmetro de busca para a API', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSpecialties('yoga'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data.every((s) => s.label.toLowerCase().includes('yoga'))).toBe(
      true,
    )
  })

  it('marca isError quando a API falha', async () => {
    server.use(
      http.get('*/specialties', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSpecialties(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
