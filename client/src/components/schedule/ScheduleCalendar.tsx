import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { Schedule, ScheduleStatus } from '@/types/api'

const HOUR_HEIGHT = 72 // px per hour
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// fundo na escada de superfícies; cor do status exclusivamente na borda e no texto
const STATUS_BLOCK: Record<ScheduleStatus, { bg: string; border: string; text: string }> = {
  AVAILABLE: {
    bg: 'bg-surface-container-high',
    border: 'border-l-[3px] border-outline-variant/50',
    text: 'text-on-surface-variant',
  },
  REQUESTED: {
    bg: 'bg-surface-container-high',
    border: 'border-l-[3px] border-secondary',
    text: 'text-secondary',
  },
  BOOKED: {
    bg: 'bg-surface-container-high',
    border: 'border-l-[3px] border-primary',
    text: 'text-primary',
  },
  COMPLETED: {
    bg: 'bg-surface-container-high',
    border: 'border-l-[3px] border-tertiary',
    text: 'text-tertiary',
  },
  NOSHOW: {
    bg: 'bg-surface-container-high',
    border: 'border-l-[3px] border-error',
    text: 'text-error',
  },
  CANCELLED: {
    bg: 'bg-surface-container',
    border: 'border-l-[3px] border-outline-variant/20',
    text: 'text-on-surface-variant/40',
  },
}

const STATUS_DOT: Record<ScheduleStatus, string> = {
  AVAILABLE: 'bg-outline-variant',
  REQUESTED: 'bg-secondary',
  BOOKED: 'bg-primary',
  COMPLETED: 'bg-tertiary',
  NOSHOW: 'bg-error',
  CANCELLED: 'bg-outline-variant/40',
}

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  AVAILABLE: 'Disponível',
  REQUESTED: 'Solicitado',
  BOOKED: 'Agendado',
  COMPLETED: 'Concluído',
  NOSHOW: 'No-show',
  CANCELLED: 'Cancelado',
}

function dateToYMD(date: Date): string {
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

// Reads the local time as written in the ISO string (timezone-offset-aware display)
// "2024-06-12T08:30:00-03:00" → 510 (minutes since midnight)
function isoDisplayMinutes(iso: string): number {
  const h = parseInt(iso.slice(11, 13), 10)
  const m = parseInt(iso.slice(14, 16), 10)
  return h * 60 + m
}

function slotTopPx(iso: string): number {
  const min = isoDisplayMinutes(iso) - START_HOUR * 60
  return Math.max(0, (min / 60) * HOUR_HEIGHT)
}

function slotHeightPx(isoStart: string, isoEnd: string): number {
  const dur = isoDisplayMinutes(isoEnd) - isoDisplayMinutes(isoStart)
  return Math.max(26, (dur / 60) * HOUR_HEIGHT)
}

function nowTopPx(): number | null {
  const now = new Date()
  const min = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60
  if (min < 0 || min > TOTAL_HOURS * 60) return null
  return (min / 60) * HOUR_HEIGHT
}

function TimeGutter() {
  return (
    <div
      className="relative w-12 shrink-0 select-none border-r border-outline-variant/10"
      style={{ height: GRID_HEIGHT }}
    >
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={i}
          className="absolute right-0 w-full pr-2.5 text-right"
          style={{ top: i * HOUR_HEIGHT - 9 }}
        >
          <span className="font-label text-[11px] font-medium text-on-surface-variant/60">
            {String(START_HOUR + i).padStart(2, '0')}h
          </span>
        </div>
      ))}
    </div>
  )
}

function GridLines() {
  return (
    <>
      {/* hora cheia */}
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={`h${String(i)}`}
          className="pointer-events-none absolute inset-x-0 border-t border-outline-variant/15"
          style={{ top: i * HOUR_HEIGHT }}
        />
      ))}
      {/* meia hora */}
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div
          key={`hh${String(i)}`}
          className="pointer-events-none absolute inset-x-0 border-t border-outline-variant/6"
          style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
        />
      ))}
    </>
  )
}

function NowLine() {
  const top = nowTopPx()
  if (top === null) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top }}>
      <div
        className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-primary"
        style={{
          boxShadow: '0 0 6px 2px color-mix(in srgb, var(--color-primary) 50%, transparent)',
        }}
      />
      <div
        className="h-[1.5px] bg-primary/80"
        style={{
          boxShadow: '0 0 4px 1px color-mix(in srgb, var(--color-primary) 30%, transparent)',
        }}
      />
    </div>
  )
}

function SlotBlock({
  slot,
  specialtyLabel,
  onClick,
}: {
  slot: Schedule
  specialtyLabel: string
  onClick?: () => void
}) {
  const top = slotTopPx(slot.startDateTime)
  const height = slotHeightPx(slot.startDateTime, slot.endDateTime)
  const startH = slot.startDateTime.slice(11, 16)
  const endH = slot.endDateTime.slice(11, 16)
  const { bg, border, text } = STATUS_BLOCK[slot.status]
  const isShort = height < 40
  const isMedium = height >= 40 && height < 60

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ top, height }}
      className={`absolute inset-x-1 overflow-hidden rounded-r-md px-1.5 py-1 text-left transition-all hover:brightness-110 active:scale-[0.97] ${bg} ${border} ${text}`}
    >
      {isShort ? (
        <span className="block truncate font-label text-[10px] font-bold leading-none">
          {startH}
        </span>
      ) : isMedium ? (
        <span className="block truncate font-label text-[10px] font-bold leading-tight">
          {startH}–{endH}
        </span>
      ) : (
        <>
          <span className="block font-label text-[11px] font-bold leading-tight">
            {startH}–{endH}
          </span>
          {specialtyLabel && (
            <span className="mt-0.5 block truncate font-label text-[10px] leading-tight opacity-80">
              {specialtyLabel}
            </span>
          )}
        </>
      )}
    </button>
  )
}

function DayColumn({
  slots,
  specialtyLabels,
  isToday,
  isLast,
  onSlotClick,
}: {
  slots: Schedule[]
  specialtyLabels: Map<string, string>
  isToday: boolean
  isLast: boolean
  onSlotClick?: (slot: Schedule) => void
}) {
  return (
    <div
      className={`relative flex-1 ${isToday ? 'bg-primary/4' : ''} ${!isLast ? 'border-r border-outline-variant/10' : ''}`}
      style={{ height: GRID_HEIGHT }}
    >
      <GridLines />
      {isToday && <NowLine />}
      {slots.map((slot) => (
        <SlotBlock
          key={slot.scheduleId}
          slot={slot}
          specialtyLabel={specialtyLabels.get(slot.specialtyId) ?? ''}
          onClick={() => onSlotClick?.(slot)}
        />
      ))}
    </div>
  )
}

const ALL_VISIBLE_STATUSES: ScheduleStatus[] = [
  'AVAILABLE',
  'REQUESTED',
  'BOOKED',
  'COMPLETED',
  'NOSHOW',
]

interface Props {
  slots: Schedule[]
  specialtyLabels: Map<string, string>
  gymLabels: Map<string, string>
  onSlotClick?: (slot: Schedule) => void
  visibleStatuses?: ScheduleStatus[]
}

export default function ScheduleCalendar({
  slots,
  specialtyLabels,
  onSlotClick,
  visibleStatuses = ALL_VISIBLE_STATUSES,
}: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayStr = useMemo(() => dateToYMD(today), [today])

  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))
  const [activeDay, setActiveDay] = useState(() => today)

  const activeDayStr = dateToYMD(activeDay)

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const slot of slots) {
      if (slot.status === 'CANCELLED') continue
      const date = slot.startDateTime.slice(0, 10)
      const arr = map.get(date) ?? []
      arr.push(slot)
      map.set(date, arr)
    }
    return map
  }, [slots])

  const activeDaySlots = slotsByDate.get(activeDayStr) ?? []

  const weekLabel = (() => {
    const s = weekStart
    const e = addDays(weekStart, 6)
    if (s.getMonth() === e.getMonth()) {
      return `${MONTHS[s.getMonth()]} ${String(s.getFullYear())}`
    }
    return `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${String(e.getFullYear())}`
  })()

  function prevWeek() {
    setWeekStart((d) => addDays(d, -7))
  }
  function nextWeek() {
    setWeekStart((d) => addDays(d, 7))
  }
  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setWeekStart(getWeekStart(d))
    setActiveDay(d)
  }

  const legendStatuses = visibleStatuses

  return (
    <div className="flex flex-col gap-3">
      {/* ── Mobile: navegação diária ── */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setActiveDay((d) => addDays(d, -1))
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
          aria-label="Dia anterior"
        >
          <Icon name="chevron_left" size={22} />
        </button>

        <div className="flex flex-1 flex-col items-center gap-0.5">
          <span className="font-headline text-sm font-bold tracking-tight text-on-surface">
            {WEEKDAYS[activeDay.getDay()]}, {activeDay.getDate()} {MONTHS[activeDay.getMonth()]}
          </span>
          {activeDaySlots.length > 0 && (
            <span className="font-label text-[10px] text-on-surface-variant">
              {activeDaySlots.length} {activeDaySlots.length === 1 ? 'horário' : 'horários'}
            </span>
          )}
          {activeDayStr !== todayStr && (
            <button
              type="button"
              onClick={goToday}
              className="font-label text-[10px] font-semibold text-primary"
            >
              Ir para hoje
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveDay((d) => addDays(d, 1))
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
          aria-label="Próximo dia"
        >
          <Icon name="chevron_right" size={22} />
        </button>
      </div>

      {/* ── Desktop: navegação semanal ── */}
      <div className="hidden items-center gap-3 md:flex">
        <button
          type="button"
          onClick={prevWeek}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
          aria-label="Semana anterior"
        >
          <Icon name="chevron_left" size={20} />
        </button>

        <span className="min-w-36 text-center font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          {weekLabel}
        </span>

        <button
          type="button"
          onClick={nextWeek}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
          aria-label="Próxima semana"
        >
          <Icon name="chevron_right" size={20} />
        </button>

        <button
          type="button"
          onClick={goToday}
          className="ml-auto rounded-md border border-outline-variant/30 px-3 py-1 font-label text-xs text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          Hoje
        </button>
      </div>

      {/* Cabeçalho dos dias (desktop) */}
      <div className="hidden md:flex">
        <div className="w-12 shrink-0" />
        {weekDays.map((day) => {
          const dStr = dateToYMD(day)
          const isToday = dStr === todayStr
          const count = slotsByDate.get(dStr)?.length ?? 0
          return (
            <div key={dStr} className="flex flex-1 flex-col items-center gap-1 pb-2">
              <span
                className={`font-label text-[10px] font-bold uppercase tracking-widest ${
                  isToday ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {WEEKDAYS[day.getDay()]}
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-headline text-sm font-bold transition-colors ${
                  isToday
                    ? 'bg-primary text-on-primary-fixed shadow-[0_0_12px_rgba(244,255,198,0.25)]'
                    : 'text-on-surface'
                }`}
              >
                {day.getDate()}
              </div>
              <span
                className={`font-label text-[9px] ${
                  count > 0 ? 'text-on-surface-variant' : 'text-transparent'
                }`}
              >
                {count}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grade de horários */}
      <div
        className="overflow-y-auto rounded-xl border border-outline-variant/10 bg-surface-container-low"
        style={{ maxHeight: '480px' }}
      >
        {/* Mobile: coluna única */}
        <div className="flex md:hidden">
          <TimeGutter />
          <DayColumn
            slots={activeDaySlots}
            specialtyLabels={specialtyLabels}
            isToday={activeDayStr === todayStr}
            isLast
            {...(onSlotClick !== undefined ? { onSlotClick } : {})}
          />
        </div>

        {/* Desktop: 7 colunas */}
        <div className="hidden md:flex">
          <TimeGutter />
          {weekDays.map((day, i) => {
            const dStr = dateToYMD(day)
            return (
              <DayColumn
                key={dStr}
                slots={slotsByDate.get(dStr) ?? []}
                specialtyLabels={specialtyLabels}
                isToday={dStr === todayStr}
                isLast={i === 6}
                {...(onSlotClick !== undefined ? { onSlotClick } : {})}
              />
            )
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        {legendStatuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-sm ${STATUS_DOT[status]}`} />
            <span className="font-label text-[11px] text-on-surface-variant">
              {STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
