import { useMemo, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { fetchCoachDetail } from '@/api/coaches'
import { getStudentScheduleRequests } from '@/api/schedule'
import { StudentPaymentSimulator } from '@/components/client/StudentPaymentSimulator'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar'
import { SessionSummaryModal } from '@/components/schedule/SessionSummaryModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useStudentSpecialties } from '@/hooks/useStudentSpecialties'
import {
  formatBrazilDay,
  formatBrazilDayOfMonth,
  formatStudentScheduleTimeRange,
} from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import type {
  CoachDetail,
  RequestStatus,
  Schedule,
  ScheduleStatus,
  StudentScheduleItem,
} from '@/types/api'

type ScheduleFilter = 'upcoming' | 'requests' | 'history'

interface ScheduleViewItem {
  schedule: StudentScheduleItem
  coach: CoachDetail | undefined
}

const filterOptions: { value: ScheduleFilter; label: string }[] = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'requests', label: 'Pedidos' },
  { value: 'history', label: 'Histórico' },
]

const scheduleStatusLabels: Record<ScheduleStatus, string> = {
  AVAILABLE: 'Disponível',
  REQUESTED: 'Pendente',
  BOOKED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
  NOSHOW: 'Não compareceu',
}

const requestStatusLabels: Record<RequestStatus, string> = {
  REQUESTED: 'Aguardando treinador',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDay(value: string): string {
  return formatBrazilDay(value)
}

function formatTimeRange(schedule: StudentScheduleItem): string {
  return formatStudentScheduleTimeRange(schedule)
}

function getFilter(schedule: StudentScheduleItem): ScheduleFilter {
  if (schedule.scheduleStatus === 'REQUESTED' || schedule.request?.status === 'REQUESTED') {
    return 'requests'
  }
  if (schedule.scheduleStatus === 'BOOKED') return 'upcoming'
  return 'history'
}

function isPaid(schedule: StudentScheduleItem): boolean {
  return schedule.paymentStatus === 'PAID'
}

function toCalendarSlot(schedule: StudentScheduleItem, studentId: string): Schedule {
  return {
    scheduleId: schedule.scheduleId,
    coachId: schedule.coachId,
    gymId: schedule.gymId,
    specialtyId: schedule.specialtyId,
    startDateTime: schedule.startDateTime,
    endDateTime: schedule.endDateTime,
    price: schedule.price,
    status: schedule.scheduleStatus,
    studentId,
    paymentStatus: schedule.paymentStatus ?? null,
    rating: null,
    studentComment: null,
    requests: schedule.request ? [schedule.request] : null,
    createdAt: '',
    updatedAt: '',
  }
}

function getStatusTone(schedule: StudentScheduleItem): string {
  if (schedule.scheduleStatus === 'BOOKED') {
    return isPaid(schedule)
      ? 'bg-primary-container text-on-primary-container'
      : 'bg-secondary-container text-on-secondary-container'
  }
  if (schedule.scheduleStatus === 'COMPLETED' && isPaid(schedule)) {
    return 'bg-tertiary-container text-on-tertiary-container'
  }
  if (schedule.scheduleStatus === 'REQUESTED' || schedule.request?.status === 'REQUESTED') {
    return 'bg-secondary-container text-on-secondary-container'
  }
  if (schedule.scheduleStatus === 'CANCELLED' || schedule.request?.status === 'REJECTED') {
    return 'bg-error-container text-on-error-container'
  }
  return 'bg-surface-container-high text-on-surface-variant'
}

function getStatusLabel(schedule: StudentScheduleItem): string {
  if (schedule.scheduleStatus === 'BOOKED') {
    return isPaid(schedule) ? 'Confirmado' : 'Pagamento pendente'
  }
  if (schedule.scheduleStatus === 'COMPLETED') {
    return isPaid(schedule) ? 'Pago' : scheduleStatusLabels.COMPLETED
  }
  if (schedule.request?.status) return requestStatusLabels[schedule.request.status]
  return scheduleStatusLabels[schedule.scheduleStatus]
}

export default function ClientSchedulePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>('upcoming')
  const [selectedSlot, setSelectedSlot] = useState<Schedule | null>(null)
  const scheduleQuery = useQuery({
    queryKey: ['student-schedule-requests'],
    queryFn: getStudentScheduleRequests,
    staleTime: 20 * 1000,
  })
  const specialtiesQuery = useStudentSpecialties()

  const schedules = useMemo(() => scheduleQuery.data?.schedules ?? [], [scheduleQuery.data])
  const studentId = scheduleQuery.data?.studentId ?? ''
  const calendarSlots = useMemo(
    () => schedules.map((schedule) => toCalendarSlot(schedule, studentId)),
    [schedules, studentId],
  )
  const specialtyLabels = useMemo(
    () => new Map((specialtiesQuery.data?.data ?? []).map((s) => [s.id, s.label])),
    [specialtiesQuery.data],
  )
  const coachIds = useMemo(
    () => [...new Set(schedules.map((schedule) => schedule.coachId))],
    [schedules],
  )
  const coachQueries = useQueries({
    queries: coachIds.map((coachId) => ({
      queryKey: ['coach-detail', coachId],
      queryFn: () => fetchCoachDetail(coachId),
      staleTime: 60 * 1000,
    })),
  })
  const coachesById = useMemo(() => {
    const entries = coachIds.map((coachId, index) => [coachId, coachQueries[index]?.data] as const)
    return new Map<string, CoachDetail | undefined>(entries)
  }, [coachIds, coachQueries])

  const viewItems = useMemo<ScheduleViewItem[]>(
    () =>
      schedules
        .map((schedule) => ({
          schedule,
          coach: coachesById.get(schedule.coachId),
        }))
        .filter((item) => getFilter(item.schedule) === activeFilter),
    [activeFilter, coachesById, schedules],
  )

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-10 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <div className="min-w-0">
            <h1 className="truncate font-headline text-2xl font-bold tracking-tight lg:text-3xl">
              Suas sessões
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void scheduleQuery.refetch()}
            aria-label="Atualizar agenda"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="refresh" size={21} />
          </button>
        </header>

        <section className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-12 sm:px-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="p-4">
              <ScheduleCalendar
                slots={calendarSlots}
                specialtyLabels={specialtyLabels}
                onSlotClick={setSelectedSlot}
                visibleStatuses={['REQUESTED', 'BOOKED', 'COMPLETED', 'NOSHOW']}
                statusLabels={{ NOSHOW: 'Ausente' }}
              />
            </Card>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map((option) => {
                const selected = option.value === activeFilter
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setActiveFilter(option.value)
                    }}
                    aria-pressed={selected}
                    className={`shrink-0 rounded-full px-4 py-2 font-label text-xs font-semibold uppercase transition-colors ${
                      selected
                        ? 'bg-primary text-on-primary-fixed'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {scheduleQuery.isLoading ? <ScheduleSkeleton /> : null}

            {scheduleQuery.isError ? (
              <Card className="p-6 text-center">
                <Icon name="error" size={34} className="mx-auto mb-3 text-primary" />
                <h2 className="font-headline text-xl font-semibold">Agenda fora do ar</h2>
                <p className="mt-2 font-body text-sm text-on-surface-variant">
                  {parseApiErrors(scheduleQuery.error, 'Não foi possível carregar seus pedidos.')}
                </p>
                <Button
                  type="button"
                  onClick={() => void scheduleQuery.refetch()}
                  className="mt-5 w-full sm:w-auto"
                >
                  TENTAR DE NOVO
                </Button>
              </Card>
            ) : null}

            {!scheduleQuery.isLoading && !scheduleQuery.isError && viewItems.length === 0 ? (
              <EmptyState filter={activeFilter} />
            ) : null}

            {viewItems.length > 0 ? (
              <div className="grid gap-3">
                {viewItems.map((item) => (
                  <ScheduleCard
                    key={item.schedule.scheduleId}
                    item={item}
                    studentId={studentId}
                    onSelect={setSelectedSlot}
                    onPaymentUpdated={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ['student-schedule-requests'],
                      })
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <aside className="hidden lg:block">
            <Card className="sticky top-8 overflow-hidden p-0">
              <div className="kinetic-grid relative bg-surface-container p-5">
                <div className="relative z-10 flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    icon="search"
                    onClick={() => void navigate('/client/search')}
                    className="w-full"
                  >
                    BUSCAR PERSONAL
                  </Button>
                </div>
              </div>
            </Card>
          </aside>
        </section>
      </div>

      {selectedSlot && (
        <SessionSummaryModal
          slot={selectedSlot}
          viewer="client"
          counterpartName={coachesById.get(selectedSlot.coachId)?.profile.name ?? 'Treinador'}
          specialtyLabel={specialtyLabels.get(selectedSlot.specialtyId) ?? selectedSlot.specialtyId}
          onViewDetails={() => {
            const { scheduleId } = selectedSlot
            setSelectedSlot(null)
            void navigate(`/client/schedule/${scheduleId}`)
          }}
          onClose={() => {
            setSelectedSlot(null)
          }}
        />
      )}

      <ClientBottomNav />
    </main>
  )
}

function ScheduleCard({
  item,
  studentId,
  onSelect,
  onPaymentUpdated,
}: {
  item: ScheduleViewItem
  studentId: string
  onSelect: (slot: Schedule) => void
  onPaymentUpdated: () => void
}) {
  const { schedule, coach } = item
  const specialty = coach?.profile.specialties.find(Boolean) ?? schedule.specialtyId
  const canPay = schedule.scheduleStatus === 'BOOKED' && schedule.paymentStatus !== 'PAID'

  return (
    <Card className="p-4 transition-colors hover:bg-surface-container">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            onSelect(toCalendarSlot(schedule, studentId))
          }}
          className="flex w-full flex-col gap-4 text-left sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-on-primary-fixed">
              <span className="font-label text-[10px] font-bold uppercase">
                {formatDay(schedule.startDateTime).split(',')[0]}
              </span>
              <span className="font-headline text-xl font-black">
                {formatBrazilDayOfMonth(schedule.startDateTime)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="font-headline text-lg font-semibold">
                  {coach?.profile.name ?? 'Treinador'}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 font-label text-[10px] font-semibold uppercase ${getStatusTone(
                    schedule,
                  )}`}
                >
                  {getStatusLabel(schedule)}
                </span>
              </div>
              <p className="font-body text-sm text-on-surface-variant">
                {specialty} · {formatDay(schedule.startDateTime)} · {formatTimeRange(schedule)}
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                {formatMoney(schedule.price)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="font-label text-xs text-on-surface-variant">
              {schedule.request?.requestedAt
                ? `Pedido em ${formatDay(schedule.request.requestedAt)}`
                : scheduleStatusLabels[schedule.scheduleStatus]}
            </span>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
          </div>
        </button>
        {canPay ? (
          <StudentPaymentSimulator
            scheduleId={schedule.scheduleId}
            coachId={schedule.coachId}
            studentId={studentId}
            amountCents={Math.round(parseFloat(schedule.price) * 100)}
            amountLabel={formatMoney(schedule.price)}
            coachName={coach?.profile.name}
            specialtyLabel={specialty}
            dateLabel={`${formatDay(schedule.startDateTime)} · ${formatTimeRange(schedule)}`}
            onPaid={onPaymentUpdated}
          />
        ) : null}
      </div>
    </Card>
  )
}

function EmptyState({ filter }: { filter: ScheduleFilter }) {
  const navigate = useNavigate()
  const copy =
    filter === 'requests'
      ? 'Nenhum pedido pendente agora.'
      : filter === 'history'
        ? 'Seu histórico aparece depois das primeiras sessões.'
        : 'Você ainda não tem sessão confirmada.'

  return (
    <Card className="p-6 text-center">
      <Icon name="calendar_month" size={36} className="mx-auto text-primary" />
      <h2 className="mt-3 font-headline text-xl font-semibold">{copy}</h2>
      <p className="mx-auto mt-2 max-w-md font-body text-sm text-on-surface-variant">
        Solicite um horário no perfil de um treinador e acompanhe o pedido por aqui.
      </p>
      <Button
        type="button"
        onClick={() => void navigate('/client/search')}
        className="mt-5 w-full sm:w-auto"
        icon="search"
      >
        BUSCAR PERSONAL
      </Button>
    </Card>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl bg-surface-container-low" />
      ))}
    </div>
  )
}
