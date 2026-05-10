import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useCoachMe, useSubmitCoachForReview, useUpdateCoachMe } from './useCoachMe'
import type { Coach } from '@/types/api'
import { server } from '@/mocks/server'
import { setToken } from '@/lib/auth'
import { createWrapper } from '@/test/createWrapper'

beforeEach(() => {
  setToken('fake-jwt')
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
    localStorage.clear()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCoachMe(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('não tenta novamente em caso de erro (retry: false)', async () => {
    let calls = 0
    server.use(
      http.get('*/coaches/me', () => {
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

describe('useSubmitCoachForReview', () => {
  it('muda o status para PROFILE_REVIEW e atualiza o cache', async () => {
    const { wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useSubmitCoachForReview(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    const cached = queryClient.getQueryData<Coach>(['coachMe'])
    expect(cached?.status).toBe('PROFILE_REVIEW')
  })

  it('propaga erro 409 quando o estado atual não permite submissão', async () => {
    server.use(
      http.post('*/coaches/me/submit-for-review', () =>
        HttpResponse.json({ error: 'conflict' }, { status: 409 }),
      ),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSubmitCoachForReview(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync()
      }),
    ).rejects.toThrow()
  })
})
