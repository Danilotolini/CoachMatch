import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/http'
import { commitDraftSlots } from './scheduleCommit'
import type { Schedule } from '@/types/api'
import type { DraftSlot } from '@/types/draft'

function draft(partial: Partial<DraftSlot>): DraftSlot {
  return {
    key: 'key_1',
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    price: '120.00',
    startDateTime: '2026-06-15T07:00:00-03:00',
    endDateTime: '2026-06-15T08:00:00-03:00',
    status: 'draft',
    ...partial,
  }
}

function schedule(scheduleId: string): Schedule {
  return {
    scheduleId,
    coachId: 'coach_1',
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    startDateTime: '2026-06-15T07:00:00-03:00',
    endDateTime: '2026-06-15T08:00:00-03:00',
    price: '120.00',
    status: 'AVAILABLE',
    studentId: null,
    paymentStatus: null,
    rating: null,
    studentComment: null,
    requests: null,
    createdAt: '2026-06-11T12:00:00Z',
    updatedAt: '2026-06-11T12:00:00Z',
  }
}

describe('commitDraftSlots', () => {
  it('mantém sucesso parcial quando há 201 e 422', async () => {
    const slots = [draft({ key: 'ok' }), draft({ key: 'conflict' })]
    const create = vi
      .fn()
      .mockResolvedValueOnce(schedule('schedule_ok'))
      .mockRejectedValueOnce(new ApiError(422, 'conflict', { errors: ['Conflito de horário'] }))
    const patches: Array<{ key: string; status?: string; error?: string; scheduleId?: string }> = []

    const total = await commitDraftSlots({
      slots,
      create,
      patch: (key, partial) => patches.push({ key, ...partial }),
      onProgress: vi.fn(),
      limit: 1,
    })

    expect(total).toBe(2)
    expect(patches).toContainEqual({ key: 'ok', status: 'created', scheduleId: 'schedule_ok' })
    expect(patches).toContainEqual({
      key: 'conflict',
      status: 'error',
      error: 'Conflito de horário',
    })
  })

  it('retry envia somente error e draft, ignorando created e duplicate', async () => {
    const slots = [
      draft({ key: 'created', status: 'created', scheduleId: 'schedule_done' }),
      draft({ key: 'duplicate', status: 'duplicate' }),
      draft({ key: 'error', status: 'error' }),
      draft({ key: 'draft', status: 'draft' }),
    ]
    const create = vi.fn().mockResolvedValue(schedule('schedule_retry'))

    await commitDraftSlots({
      slots,
      create,
      patch: vi.fn(),
      limit: 1,
    })

    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls.map(([payload]) => payload.startDateTime)).toEqual([
      slots[2]?.startDateTime,
      slots[3]?.startDateTime,
    ])
  })
})
