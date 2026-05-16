import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useSuggestGym } from './useSuggestGym'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

const payload = {
  name: 'Studio Z',
  address: 'Av. Paulista, 1500',
  city: 'São Paulo',
  state: 'sp',
  neighborhood: 'Bela Vista',
  coordinates: { lat: -23.56, lng: -46.65 },
}

beforeEach(() => {
  loginAs('coach')
})

describe('useSuggestGym', () => {
  it('envia a sugestão e retorna a academia criada', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSuggestGym(), { wrapper })

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined
    await act(async () => {
      response = await result.current.mutateAsync(payload)
    })

    expect(response?.data.name).toBe('Studio Z')
    expect(response?.data.state).toBe('SP') // handler faz uppercase
    expect(response?.data.gymId).toMatch(/^gym_/)
  })

  it('invalida a query de gyms ao concluir com sucesso', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSuggestGym(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['gyms'] })
  })

  it('propaga erro quando o servidor falha', async () => {
    server.use(
      http.post('*/gyms/suggest', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSuggestGym(), { wrapper })

    await expect(
      act(async () => {
        await result.current.mutateAsync(payload)
      }),
    ).rejects.toThrow()
  })
})
