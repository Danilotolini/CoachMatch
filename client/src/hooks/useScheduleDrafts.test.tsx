import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useScheduleDrafts } from './useScheduleDrafts'
import type { DraftSlot } from '@/types/draft'

function draft(key: string): DraftSlot {
  return {
    key,
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    price: '120.00',
    startDateTime: '2026-06-15T07:00:00-03:00',
    endDateTime: '2026-06-15T08:00:00-03:00',
    status: 'draft',
  }
}

describe('useScheduleDrafts', () => {
  it('patch com updates próximos não sobrescreve outras chaves', () => {
    const { result } = renderHook(() => useScheduleDrafts())

    act(() => {
      result.current.setDrafts([draft('a'), draft('b')])
    })

    act(() => {
      result.current.patch('a', { status: 'created', scheduleId: 'schedule_a' })
      result.current.patch('b', { status: 'error', error: 'Conflito de horário' })
    })

    expect(result.current.slots).toEqual([
      expect.objectContaining({ key: 'a', status: 'created', scheduleId: 'schedule_a' }),
      expect.objectContaining({ key: 'b', status: 'error', error: 'Conflito de horário' }),
    ])
    expect(result.current.slotsRef.current).toEqual(result.current.slots)
  })
})
