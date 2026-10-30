import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useScheduleDrafts } from './useScheduleDrafts'
import type { DraftSlot } from '@/types/draft'

const makeDraft = (key: string): DraftSlot => ({
  key,
  startDateTime: `2026-08-10T10:00:00-03:00`,
  endDateTime: `2026-08-10T11:00:00-03:00`,
  price: '150',
  specialtyId: 'sp1',
  gymId: 'gym1',
  status: 'draft',
})

describe('useScheduleDrafts', () => {
  it('começa com lista vazia', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    expect(result.current.slots).toEqual([])
  })

  it('setDrafts substitui os slots', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.setDrafts([makeDraft('a'), makeDraft('b')])
    })
    expect(result.current.slots).toHaveLength(2)
    expect(result.current.slotsRef.current).toHaveLength(2)
  })

  it('addSlot adiciona um slot à lista', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.addSlot(makeDraft('x'))
    })
    expect(result.current.slots).toHaveLength(1)
    expect(result.current.slots[0].key).toBe('x')
    expect(result.current.slotsRef.current[0].key).toBe('x')
  })

  it('addSlot acumula múltiplos slots', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.addSlot(makeDraft('a'))
      result.current.addSlot(makeDraft('b'))
    })
    expect(result.current.slots).toHaveLength(2)
  })

  it('patch atualiza o slot pela key', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.setDrafts([makeDraft('k1')])
    })
    act(() => {
      result.current.patch('k1', { price: '200' })
    })
    expect(result.current.slots[0].price).toBe('200')
    expect(result.current.slotsRef.current[0].price).toBe('200')
  })

  it('patch não altera outros slots', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.setDrafts([makeDraft('k1'), makeDraft('k2')])
    })
    act(() => {
      result.current.patch('k1', { price: '999' })
    })
    expect(result.current.slots[1].price).toBe('150')
  })

  it('removeSlot remove o slot pela key', () => {
    const { result } = renderHook(() => useScheduleDrafts())
    act(() => {
      result.current.setDrafts([makeDraft('a'), makeDraft('b')])
    })
    act(() => {
      result.current.removeSlot('a')
    })
    expect(result.current.slots).toHaveLength(1)
    expect(result.current.slots[0].key).toBe('b')
    expect(result.current.slotsRef.current).toHaveLength(1)
  })
})
