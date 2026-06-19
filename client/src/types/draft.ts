export type DraftStatus = 'draft' | 'duplicate' | 'sending' | 'created' | 'error'

export interface DraftSlot {
  key: string
  gymId: string
  specialtyId: string
  price: string
  startDateTime: string
  endDateTime: string
  status: DraftStatus
  error?: string
  scheduleId?: string
}

export interface GenerateConfig {
  gymId: string
  specialtyId: string
  price: string
  durationMinutes: number
  weekdays: number[] // 0=Dom … 6=Sáb (UTC day)
  startDate: string // 'YYYY-MM-DD'
  endDate: string // 'YYYY-MM-DD'
  windowStart: string // 'HH:mm'
  windowEnd: string // 'HH:mm'
  gapMinutes: number
}
