import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useCoachMe, useUpdateCoachMe } from './useCoachMe'
import type { Coach } from '@/types/api'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { clearAllSessions, loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('coach')
})

describe('useCoachMe', () => {
  it('busca os dados do coach autenticado', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCoachMe(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.email).toBe('mock@coachmatch.app')
    expect(result.current.data?.status).toBe('PENDING_PROFILE')
  })

  it('fica idle sem token', () => {
    clearAllSessions()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCoachMe(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('não tenta novamente em caso de erro (retry: false)', async () => {
    let calls = 0
    server.use(
      http.get('*/coach/me', () => {
        calls += 1
        return HttpResponse.json({ error: 'boom' }, { status: 500 })
      }),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCoachMe(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(calls).toBe(1)
  })
})

describe('useUpdateCoachMe', () => {
  it('envia PUT e atualiza o cache de coachMe com a resposta', async () => {
    const { wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useUpdateCoachMe(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        profile: { phone: '81999991234', cref: '123456-G/SP' },
      })
    })

    const cached = queryClient.getQueryData<Coach>(['coachMe'])
    expect(cached?.profile.phone).toBe('81999991234')
    expect(cached?.profile.cref).toBe('123456-G/SP')
  })
})
