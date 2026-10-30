import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStudentSpecialties } from './useStudentSpecialties'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('client')
})

describe('useStudentSpecialties', () => {
  it('busca especialidades do aluno', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStudentSpecialties(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(Array.isArray(result.current.data?.data)).toBe(true)
  })

  it('filtra por busca quando search é fornecido', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStudentSpecialties('Musculação'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
