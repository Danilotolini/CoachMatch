import { describe, expect, it } from 'vitest'
import { generateDrafts, markDuplicates } from './generateDrafts'
import type { GenerateConfig } from '@/types/draft'
import type { Schedule } from '@/types/api'

const baseConfig: GenerateConfig = {
  gymId: 'gym_1',
  specialtyId: 'MUSCULATION',
  price: '120.00',
  durationMinutes: 60,
  weekdays: [1, 3],
  startDate: '2026-06-15',
  endDate: '2026-06-17',
  windowStart: '07:00',
  windowEnd: '10:00',
  gapMinutes: 0,
}

function schedule(partial: Partial<Schedule>): Schedule {
  return {
    scheduleId: 'schedule_1',
    coachId: 'coach_1',
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    startDateTime: '2026-06-15T08:00:00-03:00',
    endDateTime: '2026-06-15T09:00:00-03:00',
    price: '120.00',
    status: 'AVAILABLE',
    studentId: null,
    paymentStatus: null,
    rating: null,
    studentComment: null,
    requests: null,
    createdAt: '2026-06-11T12:00:00Z',
    updatedAt: '2026-06-11T12:00:00Z',
    ...partial,
  }
}

describe('generateDrafts', () => {
  it('gera a quantidade certa por range, dias e janela', () => {
    const drafts = generateDrafts(baseConfig)

    expect(drafts).toHaveLength(6)
    expect(drafts.map((slot) => slot.startDateTime)).toEqual([
      '2026-06-15T07:00:00-03:00',
      '2026-06-15T08:00:00-03:00',
      '2026-06-15T09:00:00-03:00',
      '2026-06-17T07:00:00-03:00',
      '2026-06-17T08:00:00-03:00',
      '2026-06-17T09:00:00-03:00',
    ])
  })

  it('respeita timezone -03:00 nos datetimes', () => {
    const [draft] = generateDrafts({ ...baseConfig, endDate: baseConfig.startDate })

    expect(draft?.startDateTime).toBe('2026-06-15T07:00:00-03:00')
    expect(draft?.endDateTime).toBe('2026-06-15T08:00:00-03:00')
  })

  it('não cria slot parcial quando a janela não fecha com a duração', () => {
    const drafts = generateDrafts({
      ...baseConfig,
      durationMinutes: 50,
      weekdays: [1],
      startDate: '2026-06-15',
      endDate: '2026-06-15',
      windowStart: '07:00',
      windowEnd: '08:30',
    })

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.endDateTime).toBe('2026-06-15T07:50:00-03:00')
  })
})

describe('markDuplicates', () => {
  it('marca drafts que sobrepõem slots existentes ativos', () => {
    const drafts = generateDrafts({
      ...baseConfig,
      weekdays: [1],
      startDate: '2026-06-15',
      endDate: '2026-06-15',
    })

    const result = markDuplicates(drafts, [
      schedule({
        startDateTime: '2026-06-15T08:30:00-03:00',
        endDateTime: '2026-06-15T09:30:00-03:00',
      }),
    ])

    expect(result.map((slot) => slot.status)).toEqual(['draft', 'duplicate', 'duplicate'])
  })

  it('ignora slots existentes cancelados no dedup', () => {
    const drafts = generateDrafts({
      ...baseConfig,
      weekdays: [1],
      startDate: '2026-06-15',
      endDate: '2026-06-15',
    })

    const result = markDuplicates(drafts, [schedule({ status: 'CANCELLED' })])

    expect(result.every((slot) => slot.status === 'draft')).toBe(true)
  })
})
