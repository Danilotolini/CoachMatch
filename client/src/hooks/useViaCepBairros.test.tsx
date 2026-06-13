import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useViaCepBairros } from './useViaCepBairros'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'

const VIACEP_URL = 'https://viacep.com.br/ws/:uf/:city/:logradouro/json/'

describe('useViaCepBairros', () => {
  it('fica idle quando uf ou city são nulos', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useViaCepBairros(null, null, 'paulista'), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fica idle enquanto o logradouro tiver menos de 3 caracteres', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useViaCepBairros('SP', 'São Paulo', 'pa'), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('busca após o debounce e retorna a lista do handler default', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useViaCepBairros('SP', 'São Paulo', 'paulista'), {
      wrapper,
    })

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 },
    )

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.bairro).toBe('Bela Vista')
  })

  it('retorna lista vazia quando a API responde com { erro: true }', async () => {
    server.use(http.get(VIACEP_URL, () => HttpResponse.json({ erro: true })))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useViaCepBairros('SP', 'São Paulo', 'inexistente'), {
      wrapper,
    })

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 },
    )

    expect(result.current.data).toEqual([])
  })

  it('marca isError quando a chamada falha', async () => {
    server.use(http.get(VIACEP_URL, () => HttpResponse.error()))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useViaCepBairros('SP', 'São Paulo', 'paulista'), {
      wrapper,
    })

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true)
      },
      { timeout: 2000 },
    )
  })
})
