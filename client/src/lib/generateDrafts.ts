import type { Schedule } from '@/types/api'
import type { DraftSlot, GenerateConfig } from '@/types/draft'

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// UTC noon trick: evita que DST mude o dia ao converter para local
function getUTCDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay()
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function generateDrafts(config: GenerateConfig): DraftSlot[] {
  const {
    gymId,
    specialtyId,
    price,
    durationMinutes,
    weekdays,
    startDate,
    endDate,
    windowStart,
    windowEnd,
    gapMinutes,
  } = config

  if (!gymId || !specialtyId || !price || weekdays.length === 0) return []

  const slots: DraftSlot[] = []
  const winStartMin = timeToMinutes(windowStart)
  const winEndMin = timeToMinutes(windowEnd)

  let current = startDate
  while (current <= endDate) {
    if (weekdays.includes(getUTCDayOfWeek(current))) {
      let slotStart = winStartMin
      while (slotStart + durationMinutes <= winEndMin) {
        const slotEnd = slotStart + durationMinutes
        slots.push({
          key: crypto.randomUUID(),
          gymId,
          specialtyId,
          price,
          startDateTime: `${current}T${minutesToTime(slotStart)}:00-03:00`,
          endDateTime: `${current}T${minutesToTime(slotEnd)}:00-03:00`,
          status: 'draft',
        })
        slotStart = slotEnd + gapMinutes
      }
    }
    current = addOneDay(current)
  }

  return slots
}

export function markDuplicates(drafts: DraftSlot[], existing: Schedule[]): DraftSlot[] {
  if (drafts.length === 0 || existing.length === 0) return drafts
  const active = existing
    .filter((s) => s.status !== 'CANCELLED')
    .map((s) => ({
      start: new Date(s.startDateTime).getTime(),
      end: new Date(s.endDateTime).getTime(),
    }))
  if (active.length === 0) return drafts
  return drafts.map((draft) => {
    const dStart = new Date(draft.startDateTime).getTime()
    const dEnd = new Date(draft.endDateTime).getTime()
    const overlaps = active.some((s) => dStart < s.end && s.start < dEnd)
    return overlaps ? { ...draft, status: 'duplicate' } : draft
  })
}
