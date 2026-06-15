import { describe, expect, it } from 'vitest'
import {
  addDaysToYMD,
  BRAZIL_TIME_ZONE,
  formatBrazilDay,
  formatBrazilDayOfMonth,
  formatBrazilTimeRange,
  formatCoachScheduleSlot,
  getTodayBrazilYMD,
} from './dateTime'
import type { CoachScheduleSlot } from '@/types/api'

describe('dateTime', () => {
  it('formata intervalos no fuso de Sao Paulo', () => {
    expect(formatBrazilTimeRange('2026-06-16T18:00:00-03:00', '2026-06-16T19:00:00-03:00')).toBe(
      '18:00-19:00',
    )
  })

  it('mantem a data e hora esperadas mesmo quando UTC renderizaria diferente', () => {
    const utcFormatter = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })

    const start = '2026-06-16T18:00:00-03:00'
    const end = '2026-06-16T19:00:00-03:00'
    const utcRange = `${utcFormatter.format(new Date(start))}-${utcFormatter.format(new Date(end))}`

    expect(utcRange).toBe('21:00-22:00')
    expect(formatBrazilTimeRange(start, end)).toBe('18:00-19:00')
  })

  it('centraliza a exibicao completa do slot para as telas', () => {
    const slot: CoachScheduleSlot = {
      scheduleId: 'schedule_1',
      coachId: 'coach_marcos',
      gymId: 'gym_1',
      price: '120.00',
      specialtyId: 'MUSCULATION',
      startDateTime: '2026-06-16T18:00:00-03:00',
      endDateTime: '2026-06-16T19:00:00-03:00',
      status: 'AVAILABLE',
    }

    expect(BRAZIL_TIME_ZONE).toBe('America/Sao_Paulo')
    expect(formatBrazilDay(slot.startDateTime)).toBe('ter., 16 de jun.')
    expect(formatBrazilDayOfMonth(slot.startDateTime)).toBe('16')
    expect(formatCoachScheduleSlot(slot)).toBe('ter., 16 de jun., 18:00-19:00')
  })

  it('resolve hoje no fuso do Brasil mesmo quando a data UTC caiu no dia seguinte', () => {
    expect(getTodayBrazilYMD(new Date('2026-06-16T01:30:00Z'))).toBe('2026-06-15')
  })

  it('soma dias em strings YYYY-MM-DD sem mudar o calendario', () => {
    expect(addDaysToYMD('2026-06-15', 28)).toBe('2026-07-13')
  })
})
