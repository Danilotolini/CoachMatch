import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useClientMe, useSubmitClientHealth, useSubmitClientProfile } from './useClientMe'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('client')
})

describe('useClientMe', () => {
  it('busca os dados do aluno autenticado', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useClientMe(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
  })
})

describe('useSubmitClientHealth', () => {
  it('expõe a mutação de saúde', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSubmitClientHealth(), { wrapper })
    expect(result.current.mutate).toBeTypeOf('function')
  })
})

describe('useSubmitClientProfile', () => {
  it('expõe a mutação de perfil', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSubmitClientProfile(), { wrapper })
    expect(result.current.mutate).toBeTypeOf('function')
  })
})
