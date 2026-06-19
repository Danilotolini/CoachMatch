import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCoachDetail } from './useCoachDetail'
import { createWrapper } from '@/test/createWrapper'

const fetchCoachDetailMock = vi.fn()
const getTokenMock = vi.fn()

vi.mock('@/api/coaches', () => ({
  fetchCoachDetail: (...args: unknown[]) => fetchCoachDetailMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  getToken: () => getTokenMock(),
}))

describe('useCoachDetail', () => {
  it('não consulta quando falta coachId ou token', async () => {
    const { wrapper } = createWrapper()
    getTokenMock.mockReturnValue(null)

    const { result, rerender } = renderHook(({ coachId }) => useCoachDetail(coachId), {
      wrapper,
      initialProps: { coachId: undefined as string | undefined },
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchCoachDetailMock).not.toHaveBeenCalled()

    rerender({ coachId: 'coach_1' })
    expect(fetchCoachDetailMock).not.toHaveBeenCalled()
  })

  it('consulta o detalhe quando há coachId e sessão', async () => {
    const { wrapper } = createWrapper()
    getTokenMock.mockReturnValue('token')
    fetchCoachDetailMock.mockResolvedValue({
      coachId: 'coach_1',
      name: 'Marcos Vieira',
    })

    const { result } = renderHook(() => useCoachDetail('coach_1'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual({
        coachId: 'coach_1',
        name: 'Marcos Vieira',
      })
    })
    expect(fetchCoachDetailMock).toHaveBeenCalledWith('coach_1')
  })
})
