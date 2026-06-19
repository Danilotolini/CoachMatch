import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { CoachSideNav, CoachBottomNav } from '@/components/layout/CoachNavigation'
import { cancelCoachSchedule, createSchedule, getCoachSchedule } from '@/api/schedule'
import { useCoachMe } from '@/hooks/useCoachMe'
import { useGyms } from '@/hooks/useGyms'
import { useSpecialties } from '@/hooks/useSpecialties'
import { useScheduleDrafts } from '@/hooks/useScheduleDrafts'
import {
  useApproveCoachScheduleRequest,
  useCancelCoachSchedule,
  useCoachSchedule,
  useCoachScheduleRequests,
  useUpdateCoachClassStatus,
} from '@/hooks/useCoachSchedule'
import { addDaysToYMD, formatBrazilDay, getTodayBrazilYMD, nowMs } from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import { generateDrafts, markDuplicates } from '@/lib/generateDrafts'
import { runPool } from '@/lib/runPool'
import { commitDraftSlots } from '@/lib/scheduleCommit'
import { Icon } from '@/components/ui/Icon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar'
import type { CalendarTimeSelection } from '@/components/schedule/ScheduleCalendar'
import { SessionSummaryModal } from '@/components/schedule/SessionSummaryModal'
import type {
  ClassStatus,
  Schedule,
  ScheduleRequest,
  ScheduleRequestsResponse,
  ScheduleStatus,
  Specialty,
  Gym,
  WorkLocation,
} from '@/types/api'
import type { DraftSlot, DraftStatus, GenerateConfig } from '@/types/draft'

type ScheduleGymOption = Pick<Gym, 'gymId' | 'name' | 'neighborhood' | 'city'>

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
]

const GAP_OPTIONS = [
  { value: 0, label: 'Sem intervalo' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
]

// Estilos de campo/botão reaproveitados em todo o formulário de agenda.
const FIELD_CLASS =
  'rounded-lg border border-outline-variant/30 bg-surface-container px-4 py-3 font-label text-sm outline-none focus:border-primary'
const FIELD_CLASS_SM =
  'rounded-md border border-outline-variant/30 bg-surface-container px-2 py-1.5 font-label text-xs outline-none focus:border-primary'
const FIELD_LABEL_CLASS = 'font-label text-xs font-medium text-on-surface-variant'
const FIELD_LABEL_CLASS_SM = 'font-label text-[10px] font-medium text-on-surface-variant'
const BTN_PRIMARY_SM =
  'rounded-md bg-primary px-3 py-1.5 font-label text-xs font-semibold text-on-primary-fixed transition-all hover:brightness-110 active:scale-95 disabled:opacity-40'
const BTN_GHOST_SM =
  'rounded-md px-3 py-1.5 font-label text-xs text-on-surface-variant transition-colors hover:bg-surface-container'
const BTN_CTA =
  'w-full rounded-xl bg-primary py-4 font-headline font-bold tracking-wide text-on-primary-fixed uppercase transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

function maskPrice(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10)
  const reais = Math.floor(num / 100)
  const cents = num % 100
  return reais.toLocaleString('pt-BR') + ',' + String(cents).padStart(2, '0')
}

function unmaskPrice(masked: string): string {
  if (!masked) return ''
  return masked.replace(/\./g, '').replace(',', '.')
}

function toDisplayPrice(apiPrice: string): string {
  if (!apiPrice) return ''
  return maskPrice(apiPrice.replace(/\D/g, ''))
}

// Quantos dias para trás a agenda carrega para permitir fechar sessões passadas.
const CLOSE_WINDOW_DAYS = 7

function getDefaultConfig(): GenerateConfig {
  const today = getTodayBrazilYMD()
  return {
    gymId: '',
    specialtyId: '',
    price: '',
    durationMinutes: 60,
    weekdays: [1, 2, 3, 4, 5],
    startDate: today,
    endDate: addDaysToYMD(today, 28),
    windowStart: '08:00',
    windowEnd: '17:00',
    gapMinutes: 0,
  }
}

function getCoachGymIds(workLocations: WorkLocation[] | undefined): string[] {
  const gymIds = (workLocations ?? []).map((location) => location.gymId)
  return [...new Set(gymIds)]
}

function buildCoachGyms(coachGymIds: string[], gyms: ScheduleGymOption[]): ScheduleGymOption[] {
  const gymsById = new Map(gyms.map((gym) => [gym.gymId, gym]))
  return coachGymIds.map(
    (gymId) => gymsById.get(gymId) ?? { gymId, name: gymId, neighborhood: '', city: '' },
  )
}

function buildCoachSpecialties(
  coachSpecialtyIds: string[] | undefined,
  specialties: Specialty[],
): Specialty[] {
  const specialtiesById = new Map(specialties.map((specialty) => [specialty.id, specialty]))
  return (coachSpecialtyIds ?? []).map(
    (specialtyId) => specialtiesById.get(specialtyId) ?? { id: specialtyId, label: specialtyId },
  )
}

function formatGymOption(gym: ScheduleGymOption): string {
  const location = [gym.neighborhood, gym.city].filter(Boolean).join(', ')
  return location ? `${gym.name} - ${location}` : gym.name
}

function formatSlotTime(iso: string): string {
  return iso.slice(11, 16)
}

function formatDayHeader(dateStr: string): string {
  return formatBrazilDay(`${dateStr}T12:00:00-03:00`)
}

function formatDateTime(iso: string): string {
  return `${formatDayHeader(iso.slice(0, 10))}, ${formatSlotTime(iso)}`
}

function isPastSlot(slot: Schedule): boolean {
  return new Date(slot.startDateTime).getTime() <= nowMs()
}

function plural(count: number, singular: string, plural: string): string {
  return `${String(count)} ${count === 1 ? singular : plural}`
}

function scheduleCanCancel(slot: Schedule): boolean {
  return slot.status !== 'COMPLETED' && slot.status !== 'NOSHOW' && slot.status !== 'CANCELLED'
}

function needsCancelWarning(slot: Schedule): boolean {
  return slot.status === 'REQUESTED' || slot.status === 'BOOKED'
}

const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  AVAILABLE: 'Disponível',
  REQUESTED: 'Solicitado',
  BOOKED: 'Agendado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
  NOSHOW: 'Aluno Ausente',
}

const STATUS_LABELS: Record<DraftStatus, string> = {
  draft: 'Pendente',
  duplicate: 'Conflito',
  sending: 'Enviando…',
  created: 'Criado',
  error: 'Erro',
}

const STATUS_CLASSES: Record<DraftStatus, string> = {
  draft: 'bg-surface-container-high text-on-surface-variant',
  duplicate: 'bg-surface-container-high text-on-surface-variant',
  sending: 'bg-secondary-container text-on-secondary-container',
  created: 'bg-tertiary-container text-on-tertiary-container',
  error: 'bg-error-container text-on-error-container',
}

function StatusChip({ status }: { status: DraftStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 font-label text-[10px] font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const SCHEDULE_STATUS_CHIP: Record<ScheduleStatus, { className: string }> = {
  AVAILABLE: { className: 'bg-surface-container text-on-surface-variant' },
  REQUESTED: { className: 'bg-secondary-container text-on-secondary-container' },
  BOOKED: { className: 'bg-primary-container text-on-primary-container' },
  COMPLETED: { className: 'bg-tertiary-container text-on-tertiary-container' },
  NOSHOW: { className: 'bg-error-container text-on-error-container' },
  CANCELLED: { className: 'bg-surface-container-high text-on-surface-variant opacity-60' },
}

function ScheduleStatusChip({ status }: { status: ScheduleStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 font-label text-[10px] font-semibold ${SCHEDULE_STATUS_CHIP[status].className}`}
    >
      {SCHEDULE_STATUS_LABELS[status]}
    </span>
  )
}

function SlotRow({
  slot,
  patch,
  removeSlot,
  allSlots,
  existingSlots,
}: {
  slot: DraftSlot
  patch: (key: string, partial: Partial<Omit<DraftSlot, 'key'>>) => void
  removeSlot: (key: string) => void
  allSlots: DraftSlot[]
  existingSlots: Schedule[]
}) {
  const [editing, setEditing] = useState(false)
  const [editStart, setEditStart] = useState(slot.startDateTime.slice(11, 16))
  const [editEnd, setEditEnd] = useState(slot.endDateTime.slice(11, 16))
  const [editPrice, setEditPrice] = useState(() => toDisplayPrice(slot.price))
  const [conflictError, setConflictError] = useState<string | null>(null)

  const isDuplicate = slot.status === 'duplicate'
  const isLocked = slot.status === 'sending' || slot.status === 'created'

  function handleSave() {
    const date = slot.startDateTime.slice(0, 10)
    const newStart = `${date}T${editStart}:00-03:00`
    const newEnd = `${date}T${editEnd}:00-03:00`
    const ns = new Date(newStart).getTime()
    const ne = new Date(newEnd).getTime()

    const hasConflict =
      allSlots.some(
        (s) =>
          s.key !== slot.key &&
          new Date(s.startDateTime).getTime() < ne &&
          new Date(s.endDateTime).getTime() > ns,
      ) ||
      existingSlots.some(
        (s) =>
          s.status !== 'CANCELLED' &&
          new Date(s.startDateTime).getTime() < ne &&
          new Date(s.endDateTime).getTime() > ns,
      )

    if (hasConflict) {
      setConflictError('Horário conflita com outro slot')
      return
    }

    const shouldReset = slot.status === 'duplicate' || slot.status === 'error'
    patch(slot.key, {
      startDateTime: newStart,
      endDateTime: newEnd,
      price: unmaskPrice(editPrice),
      ...(shouldReset && { status: 'draft' as const }),
    })
    setEditing(false)
  }

  function handleCancel() {
    setEditStart(slot.startDateTime.slice(11, 16))
    setEditEnd(slot.endDateTime.slice(11, 16))
    setEditPrice(toDisplayPrice(slot.price))
    setConflictError(null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-surface-container-low px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS_SM}>Início</span>
            <input
              type="time"
              value={editStart}
              onChange={(e) => {
                setEditStart(e.target.value)
                setConflictError(null)
              }}
              className={FIELD_CLASS_SM}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS_SM}>Fim</span>
            <input
              type="time"
              value={editEnd}
              onChange={(e) => {
                setEditEnd(e.target.value)
                setConflictError(null)
              }}
              className={FIELD_CLASS_SM}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL_CLASS_SM}>R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={editPrice}
              onChange={(e) => {
                setEditPrice(maskPrice(e.target.value))
              }}
              className={FIELD_CLASS_SM}
            />
          </label>
        </div>
        {conflictError && <p className="font-label text-[11px] text-error">{conflictError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleCancel} className={BTN_GHOST_SM}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className={BTN_PRIMARY_SM}>
            Salvar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-outline-variant/10 px-4 py-3 sm:flex-row sm:items-center sm:gap-2 ${
        isDuplicate ? 'bg-surface-container opacity-50' : 'bg-surface-container-low'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Icon
          name={isDuplicate ? 'block' : 'event'}
          size={16}
          className={`shrink-0 ${isDuplicate ? 'text-on-surface-variant' : 'text-primary'}`}
        />
        <span
          className={`min-w-0 flex-1 truncate font-label text-sm ${isDuplicate ? 'line-through text-on-surface-variant' : ''}`}
        >
          {formatSlotTime(slot.startDateTime)}-{formatSlotTime(slot.endDateTime)}
        </span>
        <span className="shrink-0 font-label text-xs text-on-surface-variant">
          R$ {toDisplayPrice(slot.price)}
        </span>
      </div>
      {slot.status === 'error' && slot.error && (
        <span
          className="font-label text-[10px] text-error sm:max-w-20 sm:truncate"
          title={slot.error}
        >
          {slot.error}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <StatusChip status={slot.status} />
        {!isLocked && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(true)
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
              aria-label="Editar slot"
            >
              <Icon name="edit" size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                removeSlot(slot.key)
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
              aria-label="Remover slot"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickSlotForm({
  gyms,
  specialties,
  onCreated,
  mode = 'collapsible',
  initialSlot,
  onClose,
}: {
  gyms: ScheduleGymOption[]
  specialties: Specialty[]
  onCreated: () => Promise<void>
  mode?: 'collapsible' | 'modal'
  initialSlot?: CalendarTimeSelection
  onClose?: () => void
}) {
  const isModal = mode === 'modal'
  const [open, setOpen] = useState(isModal)
  const [gymId, setGymId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(() => initialSlot?.date ?? getTodayBrazilYMD())
  const [start, setStart] = useState(initialSlot?.start ?? '08:00')
  const [end, setEnd] = useState(initialSlot?.end ?? '09:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = !!gymId && !!specialtyId && !!price && !!date && !!start && !!end && start < end

  async function handleSubmit() {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      await createSchedule({
        gymId,
        specialtyId,
        price: unmaskPrice(price),
        startDateTime: `${date}T${start}:00-03:00`,
        endDateTime: `${date}T${end}:00-03:00`,
      })
      await onCreated()
      if (isModal) {
        onClose?.()
      } else {
        setOpen(false)
      }
      setGymId('')
      setSpecialtyId('')
      setPrice('')
      setDate(initialSlot?.date ?? getTodayBrazilYMD())
      setStart(initialSlot?.start ?? '08:00')
      setEnd(initialSlot?.end ?? '09:00')
    } catch (e) {
      setError(parseApiErrors(e, 'Não foi possível criar o horário.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={`flex flex-col gap-4 ${
        isModal ? '' : 'rounded-xl border border-outline-variant/10 bg-surface-container-low p-5'
      }`}
    >
      {!isModal && (
        <button
          type="button"
          onClick={() => {
            setOpen((prev) => !prev)
          }}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
            Configuração
          </h2>
          <Icon
            name="expand_more"
            size={20}
            className={`text-on-surface-variant transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      )}

      {open && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Academia</span>
            <select
              value={gymId}
              onChange={(e) => {
                setGymId(e.target.value)
              }}
              className={FIELD_CLASS}
            >
              <option value="">Selecionar academia</option>
              {gyms.map((g) => (
                <option key={g.gymId} value={g.gymId}>
                  {formatGymOption(g)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Especialidade</span>
            <select
              value={specialtyId}
              onChange={(e) => {
                setSpecialtyId(e.target.value)
              }}
              className={FIELD_CLASS}
            >
              <option value="">Selecionar especialidade</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                }}
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Preço (R$)</span>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => {
                  setPrice(maskPrice(e.target.value))
                }}
                className={FIELD_CLASS}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Início</span>
              <input
                type="time"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value)
                }}
                className={FIELD_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Fim</span>
              <input
                type="time"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value)
                }}
                className={FIELD_CLASS}
              />
            </label>
          </div>
          {error && <p className="font-label text-[11px] text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (isModal) {
                  onClose?.()
                } else {
                  setOpen(false)
                }
                setError(null)
              }}
              className={BTN_GHOST_SM}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSubmit()
              }}
              disabled={!canSubmit || busy}
              className={BTN_PRIMARY_SM}
            >
              {busy ? 'Criando…' : 'Criar horário'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function QuickSlotModal({
  selection,
  gyms,
  specialties,
  onCreated,
  onClose,
}: {
  selection: CalendarTimeSelection
  gyms: ScheduleGymOption[]
  specialties: Specialty[]
  onCreated: () => Promise<void>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface/70 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar modal"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(760px,calc(100dvh-2rem))] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-xl border border-outline-variant/10 bg-surface-container p-5 shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-slot-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="quick-slot-modal-title"
              className="font-headline text-lg font-semibold tracking-tight text-on-surface"
            >
              Horário avulso
            </h2>
            <p className="mt-1 font-label text-xs text-on-surface-variant">
              {formatDayHeader(selection.date)}, {selection.start}-{selection.end}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
            aria-label="Fechar"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <QuickSlotForm
          key={`${selection.date}-${selection.start}`}
          mode="modal"
          initialSlot={selection}
          gyms={gyms}
          specialties={specialties}
          onCreated={onCreated}
          onClose={onClose}
        />
      </div>
    </div>
  )
}

function AddSlotForm({
  config,
  onAdd,
}: {
  config: GenerateConfig
  onAdd: (slot: DraftSlot) => void
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => getTodayBrazilYMD())
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('09:00')
  const [price, setPrice] = useState(config.price)

  const canAdd = !!date && !!start && !!end && !!price && start < end

  function handleAdd() {
    if (!canAdd) return
    onAdd({
      key: crypto.randomUUID(),
      gymId: config.gymId,
      specialtyId: config.specialtyId,
      price: unmaskPrice(price),
      startDateTime: `${date}T${start}:00-03:00`,
      endDateTime: `${date}T${end}:00-03:00`,
      status: 'draft',
    })
    setOpen(false)
    setStart('08:00')
    setEnd('09:00')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className="flex w-full items-center justify-center rounded-lg border border-dashed border-outline-variant/30 px-4 py-3 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        aria-label="Adicionar slot avulso"
      >
        <Icon name="add" size={18} />
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low px-4 py-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL_CLASS_SM}>Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
            }}
            className={FIELD_CLASS_SM}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL_CLASS_SM}>Preço (R$)</span>
          <input
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(maskPrice(e.target.value))
            }}
            className={FIELD_CLASS_SM}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL_CLASS_SM}>Início</span>
          <input
            type="time"
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
            }}
            className={FIELD_CLASS_SM}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={FIELD_LABEL_CLASS_SM}>Fim</span>
          <input
            type="time"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value)
            }}
            className={FIELD_CLASS_SM}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
          }}
          className={BTN_GHOST_SM}
        >
          Cancelar
        </button>
        <button type="button" onClick={handleAdd} disabled={!canAdd} className={BTN_PRIMARY_SM}>
          Adicionar
        </button>
      </div>
    </div>
  )
}

function ExistingScheduleRow({
  slot,
  specialtyLabel,
  gymLabel,
  onCancel,
  busy,
  error,
}: {
  slot: Schedule
  specialtyLabel: string
  gymLabel: string
  onCancel: (slot: Schedule) => void
  busy: boolean
  error?: string
}) {
  const canCancel = scheduleCanCancel(slot)
  const approvedRequest = slot.requests?.find((r) => r.status === 'APPROVED')
  const pendingCount =
    slot.status === 'REQUESTED'
      ? (slot.requests?.filter((r) => r.status === 'REQUESTED').length ?? 0)
      : 0
  const paymentLabel =
    (slot.status === 'COMPLETED' || slot.status === 'NOSHOW') && slot.paymentStatus
      ? slot.paymentStatus === 'PENDING'
        ? 'pendente'
        : slot.paymentStatus.toLowerCase()
      : null

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-surface-container-low px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <p className="font-label text-sm font-semibold text-on-surface">
            {formatDateTime(slot.startDateTime)}–{formatSlotTime(slot.endDateTime)}
          </p>
          {approvedRequest?.studentName && (
            <p className="font-label text-xs font-medium text-on-surface">
              {approvedRequest.studentName}
            </p>
          )}
          <p className="truncate font-label text-xs text-on-surface-variant">
            {specialtyLabel}
            {gymLabel ? ` · ${gymLabel}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-label text-xs text-on-surface-variant">
              R$ {toDisplayPrice(slot.price)}
            </span>
            {pendingCount > 0 && (
              <span className="font-label text-xs font-semibold text-on-surface">
                {pendingCount} {pendingCount === 1 ? 'solicitação' : 'solicitações'}
              </span>
            )}
            {paymentLabel ? (
              <span className="font-label text-xs text-on-surface-variant">
                pgto. {paymentLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ScheduleStatusChip status={slot.status} />
          <button
            type="button"
            onClick={() => {
              onCancel(slot)
            }}
            disabled={!canCancel || busy}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container disabled:opacity-30"
            aria-label="Cancelar horário"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>
      {error && <p className="font-label text-[11px] text-error">{error}</p>}
    </div>
  )
}

function DayGroup({
  date,
  count,
  initialOpen,
  label,
  children,
}: {
  date: string
  count: number
  initialOpen: boolean
  label?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
        }}
        className="flex w-full items-center gap-2 rounded-md px-1 py-2 text-left transition-colors hover:bg-surface-container-high"
      >
        <Icon
          name="expand_more"
          size={16}
          className={`shrink-0 text-on-surface-variant transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
        />
        <span className="font-label text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          {label ?? formatDayHeader(date)}
        </span>
        <span className="ml-auto font-label text-xs text-on-surface-variant">
          {count} {count === 1 ? 'horário' : 'horários'}
        </span>
      </button>
      {open && <div className="mt-1 flex flex-col gap-1 pl-1">{children}</div>}
    </div>
  )
}

function PendingRequestCard({
  slot,
  details,
  specialtyLabel,
  busyId,
  error,
  onApprove,
  onSelect,
}: {
  slot: Schedule
  details?: ScheduleRequestsResponse
  specialtyLabel: string
  busyId: string | null
  error?: string
  onApprove: (slot: Schedule, request: ScheduleRequest) => void
  onSelect: (slot: Schedule) => void
}) {
  const requests = (details?.requests ?? slot.requests ?? []).filter(
    (r) => r.status === 'REQUESTED',
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low px-4 py-3">
      <button
        type="button"
        onClick={() => {
          onSelect(slot)
        }}
        className="-mx-2 -mt-1 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-container"
      >
        <span className="min-w-0">
          <span className="block font-label text-sm font-semibold text-on-surface">
            {formatDateTime(slot.startDateTime)}-{formatSlotTime(slot.endDateTime)}
          </span>
          <span className="block font-label text-xs text-on-surface-variant">{specialtyLabel}</span>
        </span>
        <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
      </button>
      {requests.length === 0 ? (
        <p className="font-label text-xs text-on-surface-variant">Carregando solicitações...</p>
      ) : (
        requests.map((request) => {
          const actionId = `${slot.scheduleId}:${request.studentId}`
          return (
            <div key={request.studentId} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-label text-sm">
                {request.studentName ?? 'Aluno'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onApprove(slot, request)
                }}
                disabled={busyId === actionId}
                className="shrink-0 rounded-md bg-primary px-3 py-1.5 font-label text-xs font-semibold text-on-primary-fixed transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                Aprovar
              </button>
            </div>
          )
        })
      )}
      {error && <p className="font-label text-[11px] text-error">{error}</p>}
    </div>
  )
}

function BookedClassRow({
  slot,
  specialtyLabel,
  busyId,
  error,
  onStatus,
}: {
  slot: Schedule
  specialtyLabel: string
  busyId: string | null
  error?: string
  onStatus: (slot: Schedule, status: ClassStatus) => void
}) {
  const approved = slot.requests?.find((r) => r.status === 'APPROVED')

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-container-low px-4 py-3">
      <div>
        <p className="font-label text-sm font-semibold text-on-surface">
          {formatDateTime(slot.startDateTime)}-{formatSlotTime(slot.endDateTime)}
        </p>
        <p className="font-label text-xs text-on-surface-variant">
          {approved?.studentName ?? 'Aluno'} · {specialtyLabel}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            onStatus(slot, 'NOSHOW')
          }}
          disabled={busyId === `${slot.scheduleId}:NOSHOW`}
          className="rounded-md px-3 py-1.5 font-label text-xs text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40"
        >
          Aluno Ausente
        </button>
        <button
          type="button"
          onClick={() => {
            onStatus(slot, 'COMPLETED')
          }}
          disabled={busyId === `${slot.scheduleId}:COMPLETED`}
          className={BTN_PRIMARY_SM}
        >
          Concluir
        </button>
      </div>
      {error && <p className="font-label text-[11px] text-error">{error}</p>}
    </div>
  )
}

function SessionHistoryRow({
  slot,
  specialtyLabel,
  onView,
}: {
  slot: Schedule
  specialtyLabel: string
  onView: (slot: Schedule) => void
}) {
  const approved = slot.requests?.find((r) => r.status === 'APPROVED')

  return (
    <button
      type="button"
      onClick={() => {
        onView(slot)
      }}
      className="flex w-full items-center justify-between gap-3 rounded-lg bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container"
    >
      <div className="min-w-0">
        <p className="font-label text-sm font-semibold text-on-surface">
          {formatDateTime(slot.startDateTime)}-{formatSlotTime(slot.endDateTime)}
        </p>
        <p className="truncate font-label text-xs text-on-surface-variant">
          {approved?.studentName ?? 'Aluno'} · {specialtyLabel}
        </p>
      </div>
      <ScheduleStatusChip status={slot.status} />
    </button>
  )
}

function GerarTab({
  hidden,
  config,
  setConfig,
}: {
  hidden: boolean
  config: GenerateConfig
  setConfig: Dispatch<SetStateAction<GenerateConfig>>
}) {
  const queryClient = useQueryClient()
  const { data: coachMe } = useCoachMe()
  const { data: gymsData } = useGyms()
  const { data: specialtiesData } = useSpecialties()
  const { data: existingSlots = [] } = useCoachSchedule(config.startDate, config.endDate)
  const { slots, slotsRef, patch, setDrafts, removeSlot, addSlot } = useScheduleDrafts()

  const [isDeduping, setIsDeduping] = useState(false)
  const [commitTotal, setCommitTotal] = useState(0)
  const [progressDone, setProgressDone] = useState(0)
  const [confirmUndo, setConfirmUndo] = useState(false)

  const gyms = useMemo(() => gymsData?.data ?? [], [gymsData?.data])
  const specialties = useMemo(() => specialtiesData?.data ?? [], [specialtiesData?.data])
  const coachGymIds = useMemo(
    () => getCoachGymIds(coachMe?.work_location),
    [coachMe?.work_location],
  )
  const coachGyms = useMemo(() => buildCoachGyms(coachGymIds, gyms), [coachGymIds, gyms])
  const coachSpecialties = useMemo(
    () => buildCoachSpecialties(coachMe?.profile.specialties, specialties),
    [coachMe?.profile.specialties, specialties],
  )

  const slotsByDay = useMemo(() => {
    const sorted = [...slots].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
    const groups: { date: string; slots: DraftSlot[] }[] = []
    for (const slot of sorted) {
      const date = slot.startDateTime.slice(0, 10)
      const last = groups.length > 0 ? groups[groups.length - 1] : null
      if (last?.date === date) {
        last.slots.push(slot)
      } else {
        groups.push({ date, slots: [slot] })
      }
    }
    return groups
  }, [slots])

  const [wsh, wsm] = config.windowStart.split(':').map(Number)
  const [weh, wem] = config.windowEnd.split(':').map(Number)
  const winStartMin = wsh * 60 + wsm
  const winEndMin = weh * 60 + wem
  const hasAllowedGym = coachGyms.some((gym) => gym.gymId === config.gymId)
  const hasAllowedSpecialty = coachSpecialties.some(
    (specialty) => specialty.id === config.specialtyId,
  )

  const canGenerate =
    hasAllowedGym &&
    hasAllowedSpecialty &&
    !!config.price &&
    config.weekdays.length > 0 &&
    config.startDate <= config.endDate &&
    winStartMin < winEndMin &&
    winEndMin - winStartMin >= config.durationMinutes

  const duplicateCount = slots.filter((s) => s.status === 'duplicate').length
  const freshCount = slots.length - duplicateCount
  const isCommitting = slots.some((s) => s.status === 'sending')
  const canCommit = !isCommitting && slots.some((s) => s.status === 'draft' || s.status === 'error')
  const createdCount = slots.filter((s) => s.status === 'created').length
  const errorCount = slots.filter((s) => s.status === 'error').length
  const isRetry = commitTotal > 0 && errorCount > 0 && !slots.some((s) => s.status === 'draft')

  function toggleWeekday(day: number) {
    setConfig((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort((a, b) => a - b),
    }))
  }

  async function handleGenerate() {
    const drafts = generateDrafts({ ...config, price: unmaskPrice(config.price) })
    setCommitTotal(0)
    setProgressDone(0)
    setIsDeduping(true)
    try {
      const existing = await getCoachSchedule({
        startDateTime: `${config.startDate}T00:00:00-03:00`,
        endDateTime: `${config.endDate}T23:59:59-03:00`,
      })
      setDrafts(markDuplicates(drafts, existing))
    } catch {
      setDrafts(drafts)
    } finally {
      setIsDeduping(false)
    }
  }

  async function commit() {
    const targets = slotsRef.current.filter((s) => s.status === 'draft' || s.status === 'error')
    if (targets.length === 0) return
    setCommitTotal(targets.length)
    setProgressDone(0)
    await commitDraftSlots({
      slots: slotsRef.current,
      patch,
      create: createSchedule,
      onProgress: () => {
        setProgressDone((prev) => prev + 1)
      },
    })
    await queryClient.invalidateQueries({ queryKey: ['coachSchedule'] })
  }

  async function undoCreatedDrafts() {
    setConfirmUndo(false)
    const createdDrafts = slotsRef.current.filter(
      (slot) => slot.status === 'created' && slot.scheduleId,
    )
    if (createdDrafts.length === 0) return

    setCommitTotal(createdDrafts.length)
    setProgressDone(0)
    await runPool(createdDrafts, 4, async (slot) => {
      if (!slot.scheduleId) return
      patch(slot.key, { status: 'sending' })
      try {
        await cancelCoachSchedule(slot.scheduleId)
        removeSlot(slot.key)
      } catch (error) {
        patch(slot.key, {
          status: 'error',
          error: parseApiErrors(error, 'Não foi possível desfazer este slot.'),
        })
      } finally {
        setProgressDone((prev) => prev + 1)
      }
    })
    await queryClient.invalidateQueries({ queryKey: ['coachSchedule'] })
  }

  return (
    <div className={`flex flex-col gap-6 px-6 pb-12 md:px-12 lg:px-10 ${hidden ? 'hidden' : ''}`}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-headline text-lg font-semibold tracking-tight text-on-surface">
            Horários em lote
          </h2>
          <p className="font-label text-sm text-on-surface-variant">
            Configure e gere vários horários de uma vez.
          </p>
        </div>

        <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
          <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
            Configuração
          </h2>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Academia</span>
            <select
              value={config.gymId}
              onChange={(e) => {
                setConfig((p) => ({ ...p, gymId: e.target.value }))
              }}
              className={FIELD_CLASS}
            >
              <option value="">Selecionar academia</option>
              {coachGyms.map((g) => (
                <option key={g.gymId} value={g.gymId}>
                  {formatGymOption(g)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASS}>Especialidade</span>
            <select
              value={config.specialtyId}
              onChange={(e) => {
                setConfig((p) => ({ ...p, specialtyId: e.target.value }))
              }}
              className={FIELD_CLASS}
            >
              <option value="">Selecionar especialidade</option>
              {coachSpecialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Preço (R$)</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={config.price}
                onChange={(e) => {
                  setConfig((p) => ({ ...p, price: maskPrice(e.target.value) }))
                }}
                className={FIELD_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Duração</span>
              <select
                value={config.durationMinutes}
                onChange={(e) => {
                  setConfig((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                }}
                className={FIELD_CLASS}
              >
                {DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
            <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
              Período e horários
            </h2>

            <div className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Dias da semana</span>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((day) => {
                  const active = config.weekdays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        toggleWeekday(day.value)
                      }}
                      className={`flex-1 rounded-lg py-2.5 font-label text-xs font-semibold transition-colors active:scale-95 ${
                        active
                          ? 'bg-primary text-on-primary-fixed'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Data início</span>
                <input
                  type="date"
                  value={config.startDate}
                  onChange={(e) => {
                    setConfig((p) => ({ ...p, startDate: e.target.value }))
                  }}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Data fim</span>
                <input
                  type="date"
                  value={config.endDate}
                  onChange={(e) => {
                    setConfig((p) => ({ ...p, endDate: e.target.value }))
                  }}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Início da janela</span>
                <input
                  type="time"
                  value={config.windowStart}
                  onChange={(e) => {
                    setConfig((p) => ({ ...p, windowStart: e.target.value }))
                  }}
                  className={FIELD_CLASS}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={FIELD_LABEL_CLASS}>Fim da janela</span>
                <input
                  type="time"
                  value={config.windowEnd}
                  onChange={(e) => {
                    setConfig((p) => ({ ...p, windowEnd: e.target.value }))
                  }}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASS}>Intervalo entre slots</span>
              <select
                value={config.gapMinutes}
                onChange={(e) => {
                  setConfig((p) => ({ ...p, gapMinutes: Number(e.target.value) }))
                }}
                className={FIELD_CLASS}
              >
                {GAP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <button
            type="button"
            onClick={() => {
              void handleGenerate()
            }}
            disabled={!canGenerate || isDeduping}
            className={BTN_CTA}
          >
            {isDeduping ? 'VERIFICANDO...' : 'GERAR PRÉVIA'}
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {slots.length > 0 && (
          <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
            <div className="flex items-center justify-between">
              <span className="font-headline text-base font-semibold">
                {freshCount} {freshCount === 1 ? 'slot' : 'slots'}
                {duplicateCount > 0 && (
                  <span className="font-label text-sm font-normal text-on-surface-variant">
                    {' '}
                    · {duplicateCount}{' '}
                    {duplicateCount === 1 ? 'conflito ignorado' : 'conflitos ignorados'}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDrafts([])
                  setCommitTotal(0)
                  setProgressDone(0)
                }}
                className="font-label text-xs text-on-surface-variant transition-colors hover:text-error"
              >
                Limpar
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {slotsByDay.map(({ date, slots: daySlots }) => (
                <div key={date} className="flex flex-col gap-2">
                  <h3 className="px-1 font-label text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {formatDayHeader(date)}
                  </h3>
                  {daySlots.map((slot) => (
                    <SlotRow
                      key={slot.key}
                      slot={slot}
                      patch={patch}
                      removeSlot={removeSlot}
                      allSlots={slots}
                      existingSlots={existingSlots}
                    />
                  ))}
                </div>
              ))}
            </div>

            <AddSlotForm config={config} onAdd={addSlot} />

            {commitTotal > 0 && (
              <div className="flex flex-col gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${String((progressDone / commitTotal) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between px-0.5 font-label text-xs text-on-surface-variant">
                  <span>
                    {progressDone}/{commitTotal} processados
                  </span>
                  {progressDone === commitTotal && (
                    <span>
                      {createdCount} criados
                      {errorCount > 0 &&
                        ` · ${String(errorCount)} ${errorCount === 1 ? 'erro' : 'erros'}`}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void commit()
              }}
              disabled={!canCommit}
              className={BTN_CTA}
            >
              {isCommitting ? 'CRIANDO...' : isRetry ? 'TENTAR NOVAMENTE' : 'CONFIRMAR SLOTS'}
            </button>

            {createdCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConfirmUndo(true)
                }}
                disabled={isCommitting}
                className="w-full rounded-xl border border-outline-variant/30 py-3 font-headline text-sm font-bold tracking-wide text-on-surface-variant uppercase transition-colors hover:border-error hover:text-error disabled:opacity-40"
              >
                DESFAZER CRIADOS
              </button>
            )}
          </section>
        )}
      </div>

      {confirmUndo && (
        <ConfirmDialog
          title="Desfazer slots criados?"
          description={`${String(createdCount)} ${createdCount === 1 ? 'slot criado neste lote será cancelado' : 'slots criados neste lote serão cancelados'}. Esta ação não pode ser desfeita.`}
          confirmLabel="DESFAZER"
          tone="danger"
          onConfirm={() => {
            void undoCreatedDrafts()
          }}
          onClose={() => {
            setConfirmUndo(false)
          }}
        />
      )}
    </div>
  )
}

function AgendaTab({
  hidden,
  startDate,
  endDate,
}: {
  hidden: boolean
  startDate: string
  endDate: string
}) {
  const {
    data: existingSlots = [],
    error: agendaQueryError,
    refetch: refetchAgenda,
    isLoading: isAgendaLoading,
  } = useCoachSchedule(startDate, endDate)
  const requestDetails = useCoachScheduleRequests(existingSlots)
  const { data: coachMe } = useCoachMe()
  const { data: specialtiesData } = useSpecialties()
  const { data: gymsData } = useGyms()
  const cancelMutation = useCancelCoachSchedule()
  const approveMutation = useApproveCoachScheduleRequest()
  const classStatusMutation = useUpdateCoachClassStatus()
  const navigate = useNavigate()

  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({})
  const [busyScheduleId, setBusyScheduleId] = useState<string | null>(null)
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null)
  const [busyClassId, setBusyClassId] = useState<string | null>(null)
  const [quickSlotSelection, setQuickSlotSelection] = useState<CalendarTimeSelection | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Schedule | null>(null)
  const [confirmCancelSlot, setConfirmCancelSlot] = useState<Schedule | null>(null)

  const specialties = useMemo(() => specialtiesData?.data ?? [], [specialtiesData?.data])
  const gyms = useMemo(() => gymsData?.data ?? [], [gymsData?.data])
  const coachGymIds = useMemo(
    () => getCoachGymIds(coachMe?.work_location),
    [coachMe?.work_location],
  )
  const coachGyms = useMemo(() => buildCoachGyms(coachGymIds, gyms), [coachGymIds, gyms])
  const coachSpecialties = useMemo(
    () => buildCoachSpecialties(coachMe?.profile.specialties, specialties),
    [coachMe?.profile.specialties, specialties],
  )
  const specialtyLabels = useMemo(
    () => new Map(coachSpecialties.map((s) => [s.id, s.label])),
    [coachSpecialties],
  )
  const gymLabels = useMemo(() => new Map(coachGyms.map((g) => [g.gymId, g.name])), [coachGyms])

  const agendaError = agendaQueryError
    ? parseApiErrors(agendaQueryError, 'Não foi possível carregar a agenda.')
    : null

  const visibleExistingSlots = existingSlots.filter(
    (slot) => slot.status !== 'CANCELLED' && !(slot.status === 'AVAILABLE' && isPastSlot(slot)),
  )

  const existingSlotsByDay = useMemo(() => {
    const groups: { date: string; slots: Schedule[] }[] = []
    for (const slot of existingSlots) {
      if (slot.status === 'CANCELLED') continue
      if (slot.status === 'AVAILABLE' && isPastSlot(slot)) continue
      const date = slot.startDateTime.slice(0, 10)
      const last = groups.at(-1)
      if (last?.date === date) {
        last.slots.push(slot)
      } else {
        groups.push({ date, slots: [slot] })
      }
    }
    return groups
  }, [existingSlots])

  const pendingSlots = visibleExistingSlots.filter((slot) => slot.status === 'REQUESTED')
  const actionableBookedSlots = visibleExistingSlots.filter(
    (slot) => slot.status === 'BOOKED' && isPastSlot(slot),
  )
  const sessionHistory = visibleExistingSlots
    .filter((slot) => slot.status === 'COMPLETED' || slot.status === 'NOSHOW')
    .sort((a, b) => b.startDateTime.localeCompare(a.startDateTime))

  function requestCancelSchedule(slot: Schedule) {
    if (!scheduleCanCancel(slot)) return
    if (needsCancelWarning(slot)) {
      setConfirmCancelSlot(slot)
      return
    }
    void runCancelSchedule(slot)
  }

  async function runCancelSchedule(slot: Schedule) {
    if (!scheduleCanCancel(slot)) return
    setConfirmCancelSlot(null)
    setBusyScheduleId(slot.scheduleId)
    setScheduleErrors((prev) => ({ ...prev, [slot.scheduleId]: '' }))
    try {
      await cancelMutation.mutateAsync(slot.scheduleId)
    } catch (error) {
      setScheduleErrors((prev) => ({
        ...prev,
        [slot.scheduleId]: parseApiErrors(error, 'Não foi possível cancelar este slot.'),
      }))
    } finally {
      setBusyScheduleId(null)
    }
  }

  async function handleApproveRequest(slot: Schedule, request: ScheduleRequest) {
    const actionId = `${slot.scheduleId}:${request.studentId}`
    setBusyRequestId(actionId)
    setScheduleErrors((prev) => ({ ...prev, [slot.scheduleId]: '' }))
    try {
      await approveMutation.mutateAsync({
        scheduleId: slot.scheduleId,
        studentId: request.studentId,
      })
    } catch (error) {
      setScheduleErrors((prev) => ({
        ...prev,
        [slot.scheduleId]: parseApiErrors(error, 'Não foi possível aprovar a solicitação.'),
      }))
    } finally {
      setBusyRequestId(null)
    }
  }

  async function handleClassStatus(slot: Schedule, status: ClassStatus) {
    const actionId = `${slot.scheduleId}:${status}`
    setBusyClassId(actionId)
    setScheduleErrors((prev) => ({ ...prev, [slot.scheduleId]: '' }))
    try {
      await classStatusMutation.mutateAsync({ scheduleId: slot.scheduleId, status })
    } catch (error) {
      setScheduleErrors((prev) => ({
        ...prev,
        [slot.scheduleId]: parseApiErrors(error, 'Não foi possível atualizar a sessão.'),
      }))
    } finally {
      setBusyClassId(null)
    }
  }

  return (
    <div
      className={`grid gap-6 px-6 pb-12 md:px-12 lg:px-10 xl:grid-cols-2 ${hidden ? 'hidden' : ''}`}
    >
      <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container p-5 xl:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
              Agenda
            </h2>
            <p className="mt-1 font-label text-xs text-on-surface-variant">
              {plural(visibleExistingSlots.length, 'horário no período', 'horários no período')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refetchAgenda()
            }}
            className="rounded-md px-3 py-1.5 font-label text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Atualizar
          </button>
        </div>

        {agendaError && <p className="font-label text-xs text-error">{agendaError}</p>}

        <ScheduleCalendar
          slots={existingSlots}
          specialtyLabels={specialtyLabels}
          onSlotClick={setSelectedSlot}
          onTimeClick={setQuickSlotSelection}
          visibleStatuses={['AVAILABLE', 'REQUESTED', 'BOOKED', 'COMPLETED', 'NOSHOW', 'CANCELLED']}
        />

        {selectedSlot && (
          <SessionSummaryModal
            slot={selectedSlot}
            viewer="coach"
            counterpartName={
              selectedSlot.requests?.find((request) => request.status === 'APPROVED')
                ?.studentName ?? undefined
            }
            specialtyLabel={
              specialtyLabels.get(selectedSlot.specialtyId) ?? selectedSlot.specialtyId
            }
            gymLabel={gymLabels.get(selectedSlot.gymId) ?? selectedSlot.gymId}
            onViewDetails={() => {
              const { scheduleId } = selectedSlot
              setSelectedSlot(null)
              void navigate(`/coach/schedule/${scheduleId}`)
            }}
            onClose={() => {
              setSelectedSlot(null)
            }}
          />
        )}

        {quickSlotSelection && (
          <QuickSlotModal
            selection={quickSlotSelection}
            gyms={coachGyms}
            specialties={coachSpecialties}
            onCreated={async () => {
              await refetchAgenda()
            }}
            onClose={() => {
              setQuickSlotSelection(null)
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-outline-variant/10 bg-surface-container p-5 xl:col-span-2">
        <DayGroup
          date={getTodayBrazilYMD()}
          count={visibleExistingSlots.length}
          initialOpen={false}
          label="Lista de horários"
        >
          {isAgendaLoading ? (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 font-label text-sm text-on-surface-variant">
              Carregando agenda…
            </p>
          ) : existingSlotsByDay.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low px-4 py-3 font-label text-sm text-on-surface-variant">
              Nenhum horário criado neste intervalo.
            </p>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {existingSlotsByDay.map(({ date, slots: daySlots }) => (
                <DayGroup key={date} date={date} count={daySlots.length} initialOpen={false}>
                  {daySlots.map((slot) => (
                    <ExistingScheduleRow
                      key={slot.scheduleId}
                      slot={slot}
                      specialtyLabel={specialtyLabels.get(slot.specialtyId) ?? slot.specialtyId}
                      gymLabel={gymLabels.get(slot.gymId) ?? slot.gymId}
                      onCancel={(targetSlot) => {
                        requestCancelSchedule(targetSlot)
                      }}
                      busy={busyScheduleId === slot.scheduleId}
                      error={scheduleErrors[slot.scheduleId]}
                    />
                  ))}
                </DayGroup>
              ))}
            </div>
          )}
        </DayGroup>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container p-5">
        <div>
          <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
            Solicitações pendentes
          </h2>
          <p className="mt-1 font-label text-xs text-on-surface-variant">
            {pendingSlots.length} aguardando resposta
          </p>
        </div>

        {pendingSlots.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-3 font-label text-sm text-on-surface-variant">
            Nenhuma solicitação pendente no período.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingSlots.map((slot) => (
              <PendingRequestCard
                key={slot.scheduleId}
                slot={slot}
                {...(requestDetails[slot.scheduleId]
                  ? { details: requestDetails[slot.scheduleId] }
                  : {})}
                specialtyLabel={specialtyLabels.get(slot.specialtyId) ?? slot.specialtyId}
                busyId={busyRequestId}
                error={scheduleErrors[slot.scheduleId]}
                onApprove={(targetSlot, request) => {
                  void handleApproveRequest(targetSlot, request)
                }}
                onSelect={setSelectedSlot}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container p-5">
        <div>
          <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
            Sessões para fechar
          </h2>
          <p className="mt-1 font-label text-xs text-on-surface-variant">
            {plural(
              actionableBookedSlots.length,
              'sessão passada em aberto',
              'sessões passadas em aberto',
            )}
          </p>
        </div>

        {actionableBookedSlots.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-3 font-label text-sm text-on-surface-variant">
            Nenhuma sessão passada aguardando conclusão.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {actionableBookedSlots.map((slot) => (
              <BookedClassRow
                key={slot.scheduleId}
                slot={slot}
                specialtyLabel={specialtyLabels.get(slot.specialtyId) ?? slot.specialtyId}
                busyId={busyClassId}
                error={scheduleErrors[slot.scheduleId]}
                onStatus={(targetSlot, status) => {
                  void handleClassStatus(targetSlot, status)
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container p-5">
        <div>
          <h2 className="font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
            Histórico de sessões
          </h2>
          <p className="mt-1 font-label text-xs text-on-surface-variant">
            {plural(
              sessionHistory.length,
              'sessão fechada no período',
              'sessões fechadas no período',
            )}
          </p>
        </div>

        {sessionHistory.length === 0 ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-3 font-label text-sm text-on-surface-variant">
            Nenhuma sessão fechada no período.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessionHistory.map((slot) => (
              <SessionHistoryRow
                key={slot.scheduleId}
                slot={slot}
                specialtyLabel={specialtyLabels.get(slot.specialtyId) ?? slot.specialtyId}
                onView={setSelectedSlot}
              />
            ))}
          </div>
        )}
      </section>

      {confirmCancelSlot && (
        <ConfirmDialog
          title="Cancelar horário?"
          description={`${formatDateTime(confirmCancelSlot.startDateTime)}. O aluno será notificado e o horário ficará indisponível. Esta ação não pode ser desfeita.`}
          confirmLabel="CANCELAR HORÁRIO"
          cancelLabel="MANTER"
          tone="danger"
          busy={busyScheduleId === confirmCancelSlot.scheduleId}
          onConfirm={() => {
            void runCancelSchedule(confirmCancelSlot)
          }}
          onClose={() => {
            setConfirmCancelSlot(null)
          }}
        />
      )}
    </div>
  )
}

export default function CoachSchedulePage() {
  const [config, setConfig] = useState<GenerateConfig>(getDefaultConfig)
  const [tab, setTab] = useState<'gerar' | 'agenda'>('agenda')

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="flex items-center justify-between px-6 py-6 md:px-12 lg:px-10 lg:py-8">
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Treinador
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Agenda</h1>
          </div>
        </header>

        <div className="px-6 pb-4 md:px-12 lg:px-10">
          <div
            role="tablist"
            aria-label="Modos da agenda"
            className="flex gap-1 rounded-xl bg-surface-container p-1"
          >
            {(['agenda', 'gerar'] as const).map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`schedule-tab-${t}`}
                  aria-selected={active}
                  aria-controls={`schedule-panel-${t}`}
                  onClick={() => {
                    setTab(t)
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-label text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.98] ${
                    active
                      ? 'bg-primary text-on-primary-fixed shadow-glow-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon
                    name={t === 'gerar' ? 'add_circle' : 'calendar_today'}
                    size={16}
                    filled={active}
                  />
                  {t === 'gerar' ? 'Criar horários' : 'Agenda'}
                </button>
              )
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id="schedule-panel-gerar"
          aria-labelledby="schedule-tab-gerar"
          hidden={tab !== 'gerar'}
        >
          <GerarTab hidden={tab !== 'gerar'} config={config} setConfig={setConfig} />
        </div>
        <div
          role="tabpanel"
          id="schedule-panel-agenda"
          aria-labelledby="schedule-tab-agenda"
          hidden={tab !== 'agenda'}
        >
          <AgendaTab
            hidden={tab !== 'agenda'}
            startDate={addDaysToYMD(getTodayBrazilYMD(), -CLOSE_WINDOW_DAYS)}
            endDate={config.endDate}
          />
        </div>
      </div>

      <CoachBottomNav />
    </main>
  )
}
