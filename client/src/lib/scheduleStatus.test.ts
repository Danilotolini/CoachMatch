import { describe, expect, it } from 'vitest'
import { SCHEDULE_STATUS_CHIP, SCHEDULE_STATUS_LABELS } from './scheduleStatus'
import type { ScheduleStatus } from '@/types/api'

const STATUSES: ScheduleStatus[] = [
  'AVAILABLE',
  'REQUESTED',
  'BOOKED',
  'COMPLETED',
  'NOSHOW',
  'CANCELLED',
]

describe('SCHEDULE_STATUS_LABELS', () => {
  it('tem rótulo para cada status', () => {
    for (const status of STATUSES) {
      expect(SCHEDULE_STATUS_LABELS[status]).toBeTruthy()
    }
  })

  it('rótulo AVAILABLE é Disponível', () => {
    expect(SCHEDULE_STATUS_LABELS.AVAILABLE).toBe('Disponível')
  })

  it('rótulo BOOKED é Agendado', () => {
    expect(SCHEDULE_STATUS_LABELS.BOOKED).toBe('Agendado')
  })
})

describe('SCHEDULE_STATUS_CHIP', () => {
  it('tem classe CSS para cada status', () => {
    for (const status of STATUSES) {
      expect(SCHEDULE_STATUS_CHIP[status]).toBeTruthy()
    }
  })
})
