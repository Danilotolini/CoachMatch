import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { getCoachSchedule, getCoachScheduleRequests } from '@/api/schedule'
import { useCoachMe } from '@/hooks/useCoachMe'
import { useGyms } from '@/hooks/useGyms'
import { useSpecialties } from '@/hooks/useSpecialties'
import { parseApiErrors } from '@/lib/http'
import { CoachSideNav, CoachBottomNav } from '@/components/layout/CoachNavigation'
import type { Schedule, ScheduleRequest, ScheduleRequestsResponse } from '@/types/api'

const dashboardRangeDays = 14

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

function toApiDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(year)}-${month}-${day}`
}

function formatDateTimeRange(slot: Schedule): string {
  const start = new Date(slot.startDateTime)
  const end = new Date(slot.endDateTime)
  return `${dayFormatter.format(start)} · ${timeFormatter.format(start)}-${timeFormatter.format(end)}`
}

function getRequestedCount(slot: Schedule, details?: ScheduleRequestsResponse): number {
  return (details?.requests ?? slot.requests ?? []).filter(
    (request) => request.status === 'REQUESTED',
  ).length
}

function getApprovedStudentName(slot: Schedule): string {
  return slot.requests?.find((request) => request.status === 'APPROVED')?.studentName ?? 'Aluno'
}

function getFirstPendingRequest(
  slot: Schedule,
  details?: ScheduleRequestsResponse,
): ScheduleRequest | undefined {
  return (details?.requests ?? slot.requests ?? []).find(
    (request) => request.status === 'REQUESTED',
  )
}

/**
 * Layout breakpoints:
 * - Mobile (<lg): single-column feed, glass top header, fixed bottom nav.
 * - Desktop (lg+): 3-col shell — sticky 240px side rail (logo + nav + logout),
 *   main feed (max-w-3xl), sticky 320px aside (approved banner + profile card).
 */
export default function CoachDashboardPage() {
  const { data } = useCoachMe()
  const { data: gymsData } = useGyms()
  const { data: specialtiesData } = useSpecialties()

  const range = useMemo(() => {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + dashboardRangeDays)

    return {
      startDateTime: `${toApiDay(start)}T00:00:00-03:00`,
      endDateTime: `${toApiDay(end)}T23:59:59-03:00`,
    }
  }, [])

  const scheduleQuery = useQuery({
    queryKey: ['coach-dashboard-schedule', range.startDateTime, range.endDateTime],
    queryFn: () => getCoachSchedule(range),
    staleTime: 20 * 1000,
  })

  const profile = data?.profile
  const name = profile?.name ?? undefined
  const cref = profile?.cref ?? undefined
  const profilePhoto: string | undefined = undefined
  const firstName = name?.split(' ')[0] ?? 'treinador'
  const specialtiesCount = profile?.specialties.length ?? 0
  const gymsCount = data?.work_location.length ?? 0
  const territoryLabel = 'Academias'
  const territoryValue = String(gymsCount)
  const schedules = useMemo(
    () =>
      [...(scheduleQuery.data ?? [])].sort((a, b) =>
        a.startDateTime.localeCompare(b.startDateTime),
      ),
    [scheduleQuery.data],
  )
  const requestedSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status === 'REQUESTED'),
    [schedules],
  )
  const requestQueries = useQueries({
    queries: requestedSchedules.map((schedule) => ({
      queryKey: ['coach-schedule-requests', schedule.scheduleId],
      queryFn: () => getCoachScheduleRequests(schedule.scheduleId),
      staleTime: 20 * 1000,
    })),
  })
  const requestDetailsByScheduleId = useMemo(() => {
    const entries = requestedSchedules.map((schedule, index) => {
      const details = requestQueries[index]?.data
      return [schedule.scheduleId, details] as const
    })

    return new Map<string, ScheduleRequestsResponse | undefined>(entries)
  }, [requestQueries, requestedSchedules])
  const gyms = useMemo(() => gymsData?.data ?? [], [gymsData?.data])
  const specialties = useMemo(() => specialtiesData?.data ?? [], [specialtiesData?.data])
  const gymLabels = useMemo(() => new Map(gyms.map((gym) => [gym.gymId, gym.name])), [gyms])
  const specialtyLabels = useMemo(
    () => new Map(specialties.map((specialty) => [specialty.id, specialty.label])),
    [specialties],
  )
  const bookedSessions = useMemo(
    () => schedules.filter((schedule) => schedule.status === 'BOOKED').slice(0, 3),
    [schedules],
  )
  const pendingRequests = useMemo(
    () =>
      requestedSchedules
        .map((schedule) => ({
          schedule,
          request: getFirstPendingRequest(
            schedule,
            requestDetailsByScheduleId.get(schedule.scheduleId),
          ),
          count: getRequestedCount(schedule, requestDetailsByScheduleId.get(schedule.scheduleId)),
        }))
        .filter((item) => item.request !== undefined || item.count > 0)
        .slice(0, 4),
    [requestDetailsByScheduleId, requestedSchedules],
  )
  const pendingCount = useMemo(
    () =>
      requestedSchedules.reduce(
        (total, schedule) =>
          total + getRequestedCount(schedule, requestDetailsByScheduleId.get(schedule.scheduleId)),
        0,
      ),
    [requestDetailsByScheduleId, requestedSchedules],
  )
  const availableCount = schedules.filter((schedule) => schedule.status === 'AVAILABLE').length
  const bookedCount = schedules.filter((schedule) => schedule.status === 'BOOKED').length
  const completedCount = schedules.filter((schedule) => schedule.status === 'COMPLETED').length
  const isScheduleLoading =
    scheduleQuery.isLoading || requestQueries.some((query) => query.isLoading)

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:flex-row lg:pb-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar firstName={firstName} profilePhoto={profilePhoto} name={name} />

          <section className="flex flex-col gap-8 px-6 pb-12 md:px-12 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-10">
            <ApprovedBanner className="lg:hidden" />

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <StatCard
                icon="event_available"
                label="Livres"
                value={isScheduleLoading ? '—' : String(availableCount)}
                trend="próx. 14 dias"
              />
              <StatCard
                icon="pending_actions"
                label="Pedidos"
                value={isScheduleLoading ? '—' : String(pendingCount)}
                trend={pendingCount === 1 ? 'pendente' : 'pendentes'}
              />
              <StatCard
                icon="task_alt"
                label="Sessões"
                value={isScheduleLoading ? '—' : String(bookedCount)}
                trend={`${String(completedCount)} concluída${completedCount === 1 ? '' : 's'}`}
              />
            </div>

            <Section
              title="Próximas sessões"
              action={{ label: 'Ver agenda', icon: 'arrow_forward', to: '/coach/schedule' }}
            >
              <div className="flex flex-col gap-3">
                {scheduleQuery.isLoading ? (
                  <InlineState icon="hourglass_top" text="Carregando agenda..." />
                ) : null}
                {scheduleQuery.isError ? (
                  <InlineState
                    icon="error"
                    text={parseApiErrors(
                      scheduleQuery.error,
                      'Não foi possível carregar a agenda.',
                    )}
                  />
                ) : null}
                {!scheduleQuery.isLoading &&
                !scheduleQuery.isError &&
                bookedSessions.length === 0 ? (
                  <InlineState
                    icon="event_busy"
                    text="Nenhuma sessão confirmada nos próximos dias."
                  />
                ) : null}
                {bookedSessions.map((session) => (
                  <SessionCard
                    key={session.scheduleId}
                    clientName={getApprovedStudentName(session)}
                    when={formatDateTimeRange(session)}
                    location={gymLabels.get(session.gymId) ?? 'Local a combinar'}
                    kind={specialtyLabels.get(session.specialtyId) ?? 'Sessão'}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Novas solicitações"
              action={{ label: 'Ver tudo', icon: 'arrow_forward', to: '/coach/schedule' }}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {isScheduleLoading ? (
                  <InlineState icon="hourglass_top" text="Buscando solicitações..." />
                ) : null}
                {scheduleQuery.isError ? (
                  <InlineState
                    icon="error"
                    text={parseApiErrors(
                      scheduleQuery.error,
                      'Não foi possível carregar as solicitações.',
                    )}
                  />
                ) : null}
                {!isScheduleLoading && !scheduleQuery.isError && pendingRequests.length === 0 ? (
                  <InlineState icon="inbox" text="Você ainda não tem solicitações pendentes." />
                ) : null}
                {pendingRequests.map(({ schedule, request, count }) => (
                  <RequestCard
                    key={schedule.scheduleId}
                    name={request?.studentName ?? 'Aluno'}
                    message={`${formatDateTimeRange(schedule)} · ${
                      specialtyLabels.get(schedule.specialtyId) ?? 'Sessão'
                    }${
                      count > 1 ? ` · +${String(count - 1)} pedido${count === 2 ? '' : 's'}` : ''
                    }`}
                  />
                ))}
              </div>
            </Section>

            <Section title="Seu perfil" className="lg:hidden">
              <ProfileCard
                name={name}
                cref={cref}
                specialtiesCount={specialtiesCount}
                territoryLabel={territoryLabel}
                territoryValue={territoryValue}
              />
            </Section>
          </section>
        </div>

        <aside className="hidden border-l border-outline-variant/10 bg-surface-container-low/30 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-80 lg:shrink-0 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-6 lg:py-8 xl:w-96">
          <ApprovedBanner />
          <div>
            <h2 className="mb-4 font-headline text-sm font-semibold tracking-tight text-on-surface-variant uppercase">
              Seu perfil
            </h2>
            <ProfileCard
              name={name}
              cref={cref}
              specialtiesCount={specialtiesCount}
              territoryLabel={territoryLabel}
              territoryValue={territoryValue}
            />
          </div>
        </aside>
      </div>

      <CoachBottomNav />
    </main>
  )
}

function InlineState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex min-h-24 items-center gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-low p-4">
      <span className="material-symbols-outlined text-[22px] text-primary">{icon}</span>
      <span className="font-label text-sm text-on-surface-variant">{text}</span>
    </div>
  )
}

interface TopBarProps {
  firstName: string
  profilePhoto: string | undefined
  name: string | undefined
}

function TopBar({ firstName, profilePhoto, name }: TopBarProps) {
  return (
    <header className="flex items-center justify-between px-6 py-6 md:px-12 lg:px-10 lg:py-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-primary lg:hidden">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={name ?? ''}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined">person</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-label text-xs text-on-surface-variant">Bem-vindo,</span>
          <span className="font-headline text-lg font-bold tracking-tight lg:text-2xl">
            {firstName}
          </span>
        </div>
      </div>
    </header>
  )
}

function ApprovedBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 ${className}`}
    >
      <span className="material-symbols-outlined text-primary">verified</span>
      <div className="flex flex-1 flex-col">
        <span className="font-headline text-sm font-semibold">Perfil ativo</span>
        <span className="font-label text-xs text-on-surface-variant">
          Você está visível para alunos buscando treinadores.
        </span>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: string
  label: string
  value: string
  trend: string
}

function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-outline-variant/10 bg-surface-container-low p-4 lg:p-5">
      <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
      <span className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">{value}</span>
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <span className="font-label text-[11px] text-primary-dim">{trend}</span>
    </div>
  )
}

interface SectionProps {
  title: string
  action?: { label: string; icon: string; to?: string }
  children: React.ReactNode
  className?: string
}

function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-semibold tracking-tight">{title}</h2>
        {action?.to ? (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1 font-label text-sm font-medium text-primary transition-colors hover:underline"
          >
            {action.label}
            <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
          </Link>
        ) : action ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-label text-sm font-medium text-primary transition-colors hover:underline"
          >
            {action.label}
            <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

interface SessionCardProps {
  clientName: string
  when: string
  location: string
  kind: string
}

function SessionCard({ clientName, when, location, kind }: SessionCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
        <span className="material-symbols-outlined">event</span>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-headline text-base font-semibold">{clientName}</span>
        <span className="font-label text-sm text-on-surface-variant">
          {when} · {location}
        </span>
      </div>
      <span className="rounded-full border border-outline-variant/30 px-3 py-1 font-label text-xs font-medium text-on-surface-variant">
        {kind}
      </span>
    </div>
  )
}

interface RequestCardProps {
  name: string
  message: string
}

function RequestCard({ name, message }: RequestCardProps) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-outline-variant/10 bg-surface-container-low p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface">
          <span className="material-symbols-outlined text-[20px]">person</span>
        </div>
        <span className="font-headline text-base font-semibold">{name}</span>
      </div>
      <p className="flex-1 font-label text-sm text-on-surface-variant">"{message}"</p>
      <div className="flex">
        <Link
          to="/coach/schedule"
          className="flex-1 rounded-lg bg-primary py-2 text-center font-headline text-sm font-bold tracking-wide text-on-primary-fixed uppercase transition-all hover:brightness-105 active:scale-[0.98]"
        >
          RESPONDER
        </Link>
      </div>
    </div>
  )
}

interface ProfileCardProps {
  name: string | undefined
  cref: string | undefined
  specialtiesCount: number
  territoryLabel: string
  territoryValue: string
}

function ProfileCard({
  name,
  cref,
  specialtiesCount,
  territoryLabel,
  territoryValue,
}: ProfileCardProps) {
  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined">badge</span>
        </div>
        <div className="flex flex-col">
          <span className="font-headline text-base font-semibold">{name ?? '—'}</span>
          <span className="font-label text-sm text-on-surface-variant">CREF {cref ?? '—'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ProfileStat label="Especialidades" value={String(specialtiesCount)} />
        <ProfileStat label={territoryLabel} value={territoryValue} />
      </div>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-container py-3 px-4">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <span className="font-headline text-lg font-semibold">{value}</span>
    </div>
  )
}
