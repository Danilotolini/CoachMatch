import type { CoachScheduleSlot, Schedule, StudentScheduleItem } from '@/types/api'

export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

const ptBrYearMonthDayFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: BRAZIL_TIME_ZONE,
})

const ptBrDayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: BRAZIL_TIME_ZONE,
})

const ptBrTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BRAZIL_TIME_ZONE,
})

export function formatBrazilDay(value: string | Date): string {
  return ptBrDayFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function formatBrazilDayOfMonth(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return (
    ptBrYearMonthDayFormatter
      .formatToParts(date)
      .find((part) => part.type === 'day')
      ?.value.padStart(2, '0') ?? ''
  )
}

export function formatBrazilTime(value: string | Date): string {
  return ptBrTimeFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function toBrazilYMD(value: Date): string {
  const parts = ptBrYearMonthDayFormatter.formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year ?? '0000'}-${month ?? '00'}-${day ?? '00'}`
}

export function getTodayBrazilYMD(reference = new Date()): string {
  return toBrazilYMD(reference)
}

// Instante atual em ms (epoch UTC). É independente de fuso — fuso só importa para
// formatar data/hora na tela. Serve para centralizar o "agora" em vez de espalhar
// `Date.now()` pelo app e evita a regra de pureza do React quando usado no render.
export function nowMs(): number {
  return Date.now()
}

// UTC noon avoids shifting the calendar date while adding whole days to a YYYY-MM-DD string.
export function addDaysToYMD(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatBrazilTimeRange(start: string | Date, end: string | Date): string {
  return `${formatBrazilTime(start)}-${formatBrazilTime(end)}`
}

export function formatCoachScheduleSlot(schedule: CoachScheduleSlot): string {
  return `${formatBrazilDay(schedule.startDateTime)}, ${formatBrazilTimeRange(
    schedule.startDateTime,
    schedule.endDateTime,
  )}`
}

export function formatStudentScheduleTimeRange(schedule: StudentScheduleItem): string {
  return formatBrazilTimeRange(schedule.startDateTime, schedule.endDateTime)
}

export function formatScheduleDateTimeRange(schedule: Schedule): string {
  return `${formatBrazilDay(schedule.startDateTime)} · ${formatBrazilTimeRange(
    schedule.startDateTime,
    schedule.endDateTime,
  )}`
}
