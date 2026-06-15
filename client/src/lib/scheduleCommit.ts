import { parseApiErrors } from '@/lib/http'
import { runPool } from '@/lib/runPool'
import type { Schedule, ScheduleCreatePayload } from '@/types/api'
import type { DraftSlot } from '@/types/draft'

type DraftPatch = (key: string, partial: Partial<Omit<DraftSlot, 'key'>>) => void
type CreateSchedule = (payload: ScheduleCreatePayload) => Promise<Schedule>

export async function commitDraftSlots({
  slots,
  patch,
  create,
  onProgress,
  limit = 4,
}: {
  slots: DraftSlot[]
  patch: DraftPatch
  create: CreateSchedule
  onProgress?: () => void
  limit?: number
}): Promise<number> {
  const targets = slots.filter((slot) => slot.status === 'draft' || slot.status === 'error')
  if (targets.length === 0) return 0

  await runPool(targets, limit, async (slot) => {
    patch(slot.key, { status: 'sending' })
    try {
      const result = await create({
        gymId: slot.gymId,
        specialtyId: slot.specialtyId,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        price: slot.price,
      })
      patch(slot.key, { status: 'created', scheduleId: result.scheduleId })
    } catch (error) {
      patch(slot.key, { status: 'error', error: parseApiErrors(error, 'Falha de rede') })
    } finally {
      onProgress?.()
    }
  })

  return targets.length
}
