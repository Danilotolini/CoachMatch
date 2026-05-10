import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useEstados, useMunicipios } from './useIbgeLocalidades'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'

describe('useEstados', () => {
  it('lista os estados retornados pela IBGE', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEstados(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.length).toBeGreaterThan(0)
    expect(result.current.data?.[0]).toHaveProperty('sigla')
  })

  it('marca isError em falha da API', async () => {
    server.use(
      http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useEstados(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useMunicipios', () => {
  it('fica idle e retorna array vazio quando uf é null', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useMunicipios(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toEqual([])
  })

  it('filtra municípios pelo uf escolhido', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useMunicipios('SP'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]?.nome).toBe('São Paulo')
    expect(result.current.data[0]?.uf).toBe('SP')
  })

  it('retorna [] quando o uf não tem municípios na resposta', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useMunicipios('AC'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('extrai uf via regiao-imediata quando microrregiao está ausente', async () => {
    server.use(
      http.get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios', () =>
        HttpResponse.json([
          {
            id: 1,
            nome: 'Recife',
            'regiao-imediata': {
              'regiao-intermediaria': { UF: { sigla: 'PE' } },
            },
          },
        ]),
      ),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useMunicipios('PE'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data[0]?.uf).toBe('PE')
  })
})
