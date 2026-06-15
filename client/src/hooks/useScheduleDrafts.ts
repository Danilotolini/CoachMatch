import { useCallback, useRef, useState } from 'react'
import type { DraftSlot } from '@/types/draft'

export function useScheduleDrafts() {
  const [slots, setSlots] = useState<DraftSlot[]>([])
  const slotsRef = useRef<DraftSlot[]>(slots)

  const patch = useCallback((key: string, partial: Partial<Omit<DraftSlot, 'key'>>) => {
    setSlots((prev) => {
      const next = prev.map((s) => (s.key === key ? { ...s, ...partial } : s))
      slotsRef.current = next
      return next
    })
  }, [])

  const setDrafts = useCallback((drafts: DraftSlot[]) => {
    slotsRef.current = drafts
    setSlots(drafts)
  }, [])

  const removeSlot = useCallback((key: string) => {
    setSlots((prev) => {
      const next = prev.filter((s) => s.key !== key)
      slotsRef.current = next
      return next
    })
  }, [])

  const addSlot = useCallback((slot: DraftSlot) => {
    setSlots((prev) => {
      const next = [...prev, slot]
      slotsRef.current = next
      return next
    })
  }, [])

  return { slots, slotsRef, patch, setDrafts, removeSlot, addSlot }
}
