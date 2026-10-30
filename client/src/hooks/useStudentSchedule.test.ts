import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCancelStudentSchedule, useCancelStudentScheduleRequest } from './useStudentSchedule'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('client')
})

describe('useCancelStudentScheduleRequest', () => {
  it('expõe a mutação de cancelamento de solicitação', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCancelStudentScheduleRequest(), { wrapper })
    expect(result.current.mutate).toBeTypeOf('function')
  })
})

describe('useCancelStudentSchedule', () => {
  it('expõe a mutação de cancelamento de sessão', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCancelStudentSchedule(), { wrapper })
    expect(result.current.mutate).toBeTypeOf('function')
  })
})
