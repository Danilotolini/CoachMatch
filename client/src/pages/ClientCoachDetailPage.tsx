import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { CrefBadge } from '@/components/coach/CrefBadge'
import { RatingPill } from '@/components/coach/RatingPill'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { getStudentCoachSchedules, requestStudentSchedule } from '@/api/schedule'
import { useCoachDetail } from '@/hooks/useCoachDetail'
import { parseApiErrors } from '@/lib/http'
import type { Schedule } from '@/types/api'

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

function formatMoney(value: number | string): string {
  const amount = typeof value === 'number' ? value : Number(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSlot(schedule: Schedule): string {
  const start = new Date(schedule.startDateTime)
  const end = new Date(schedule.endDateTime)
  return `${dayFormatter.format(start)}, ${timeFormatter.format(start)}-${timeFormatter.format(end)}`
}

function nextWindow() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 21)
  return {
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  }
}

export default function ClientCoachDetailPage() {
  const { coachId } = useParams<{ coachId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [successScheduleId, setSuccessScheduleId] = useState<string | null>(null)
  const windowParams = useMemo(() => nextWindow(), [])
  const detailQuery = useCoachDetail(coachId)
  const scheduleQuery = useQuery({
    queryKey: ['student-coach-schedules', coachId, windowParams],
    queryFn: () =>
      getStudentCoachSchedules({
        coachId: coachId ?? '',
        ...windowParams,
      }),
    enabled: !!coachId,
    staleTime: 30 * 1000,
  })

  const availableSchedules = useMemo(
    () =>
      (scheduleQuery.data ?? [])
        .filter((schedule) => schedule.status === 'AVAILABLE' || schedule.status === 'REQUESTED')
        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()),
    [scheduleQuery.data],
  )
  const firstScheduleId = availableSchedules.length > 0 ? availableSchedules[0].scheduleId : null
  const activeScheduleId = selectedScheduleId ?? firstScheduleId
  const selectedSchedule = availableSchedules.find(
    (schedule) => schedule.scheduleId === activeScheduleId,
  )

  const requestMutation = useMutation({
    mutationFn: (scheduleId: string) => requestStudentSchedule(scheduleId),
    onSuccess: (result) => {
      setSuccessScheduleId(result.scheduleId)
      setSelectedScheduleId(result.scheduleId)
      void queryClient.invalidateQueries({ queryKey: ['student-coach-schedules', coachId] })
    },
  })

  function handleSchedule() {
    if (!activeScheduleId) return
    requestMutation.mutate(activeScheduleId)
  }

  const coach = detailQuery.data

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-32 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center gap-3 px-4 py-4 sm:px-6 md:px-10 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => void navigate(-1)}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" size={22} />
          </button>
          <div className="min-w-0">
            <span className="font-label text-xs text-on-surface-variant">Perfil do treinador</span>
            <h1 className="truncate font-headline text-2xl font-bold tracking-tight lg:text-3xl">
              {coach?.name ?? 'Detalhes'}
            </h1>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-12 sm:px-6 md:px-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {detailQuery.isLoading ? <DetailSkeleton /> : null}

          {detailQuery.isError ? (
            <Card className="p-6 text-center lg:col-span-2">
              <Icon name="error" size={34} className="mx-auto mb-3 text-primary" />
              <h2 className="font-headline text-xl font-semibold">
                Não foi possível carregar o treinador
              </h2>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Tente voltar para a busca e abrir o perfil novamente.
              </p>
              <Button
                type="button"
                onClick={() => void detailQuery.refetch()}
                className="mt-5 w-full sm:w-auto"
              >
                TENTAR DE NOVO
              </Button>
            </Card>
          ) : null}

          {coach ? (
            <>
              <div className="flex min-w-0 flex-col gap-5">
                <Card className="overflow-hidden p-0">
                  <div
                    className="relative min-h-84 bg-surface-container"
                    style={
                      coach.photo
                        ? {
                            backgroundImage: `url(${coach.photo})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {!coach.photo ? <div className="kinetic-grid absolute inset-0" /> : null}
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-surface-container-lowest via-surface-container-lowest/72 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <RatingPill value={coach.rating.toFixed(1)} />
                        <CrefBadge />
                      </div>
                      <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                        {coach.name}
                      </h2>
                      <p className="mt-2 max-w-2xl font-body text-sm text-on-surface-variant sm:text-base">
                        {coach.bio}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MetricCard label="Sessões" value={`${String(coach.sessionsCount)}+`} />
                  <MetricCard label="Experiência" value={`${String(coach.experienceYears)} anos`} />
                  <MetricCard label="Resposta" value={coach.responseTime} />
                  <MetricCard label="A partir de" value={formatMoney(coach.priceFrom)} />
                </div>

                <Card className="p-5">
                  <SectionTitle icon="fitness_center" title="Especialidades" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {coach.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full bg-surface-container-high px-3 py-1.5 font-label text-xs font-medium text-on-surface"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon="map" title="Atendimento" />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {coach.serviceAreas.map((area) => (
                      <div
                        key={area}
                        className="flex items-center gap-3 rounded-lg bg-surface-container px-3 py-3"
                      >
                        <Icon name="pin_drop" size={18} className="text-primary" />
                        <span className="font-body text-sm text-on-surface-variant">{area}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon="reviews" title="Avaliações" />
                  <div className="mt-4 grid gap-3">
                    {coach.reviews.map((review) => (
                      <article key={review.id} className="rounded-lg bg-surface-container p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-headline text-sm font-semibold">
                            {review.studentName}
                          </h3>
                          <RatingPill value={review.rating.toFixed(1)} />
                        </div>
                        <p className="mt-2 font-body text-sm text-on-surface-variant">
                          {review.comment}
                        </p>
                      </article>
                    ))}
                  </div>
                </Card>
              </div>

              <aside className="lg:sticky lg:top-8 lg:self-start">
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-label text-xs text-on-surface-variant">
                        Próximos horários
                      </span>
                      <h2 className="mt-1 font-headline text-xl font-semibold">Agendar sessão</h2>
                    </div>
                    <div className="rounded-lg bg-primary px-3 py-2 text-on-primary-fixed">
                      <p className="font-headline text-lg font-bold">
                        {formatMoney(coach.priceFrom)}
                      </p>
                      <p className="font-label text-[10px] font-medium uppercase">sessão</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {scheduleQuery.isLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-16 animate-pulse rounded-lg bg-surface-container"
                        />
                      ))
                    ) : availableSchedules.length > 0 ? (
                      availableSchedules.slice(0, 5).map((schedule) => {
                        const selected = activeScheduleId === schedule.scheduleId
                        const requested = successScheduleId === schedule.scheduleId
                        return (
                          <button
                            key={schedule.scheduleId}
                            type="button"
                            onClick={() => {
                              setSelectedScheduleId(schedule.scheduleId)
                            }}
                            aria-pressed={selected}
                            className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                              selected
                                ? 'border-primary bg-primary/10'
                                : 'border-outline-variant/10 bg-surface-container hover:border-primary/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-headline text-sm font-semibold">
                                {formatSlot(schedule)}
                              </p>
                              <p className="mt-0.5 font-label text-xs text-on-surface-variant">
                                {requested ? 'Solicitação enviada' : 'Presencial'}
                              </p>
                            </div>
                            <Icon
                              name={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                              size={20}
                              className={selected ? 'text-primary' : 'text-on-surface-variant'}
                            />
                          </button>
                        )
                      })
                    ) : (
                      <div className="rounded-lg bg-surface-container p-4 text-center">
                        <Icon name="event_busy" size={28} className="mx-auto text-primary" />
                        <p className="mt-2 font-body text-sm text-on-surface-variant">
                          Este treinador ainda não abriu horários para as próximas semanas.
                        </p>
                      </div>
                    )}
                  </div>

                  {requestMutation.isError ? (
                    <p className="mt-4 rounded-lg bg-error-container px-3 py-2 font-body text-sm text-on-error-container">
                      {parseApiErrors(
                        requestMutation.error,
                        'Não foi possível solicitar este horário.',
                      )}
                    </p>
                  ) : null}

                  {successScheduleId ? (
                    <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 font-body text-sm text-primary">
                      Solicitação enviada. O treinador vai confirmar o agendamento.
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    onClick={handleSchedule}
                    loading={requestMutation.isPending}
                    disabled={
                      !selectedSchedule || successScheduleId === selectedSchedule.scheduleId
                    }
                    className="mt-5 hidden w-full lg:inline-flex"
                    icon="event_available"
                  >
                    AGENDAR
                  </Button>
                </Card>
              </aside>
            </>
          ) : null}
        </section>
      </div>

      {coach ? (
        <div className="fixed inset-x-0 bottom-20 z-20 px-4 lg:hidden">
          <Card className="p-3 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
            <Button
              type="button"
              onClick={handleSchedule}
              loading={requestMutation.isPending}
              disabled={!selectedSchedule || successScheduleId === selectedSchedule.scheduleId}
              className="w-full"
              icon="event_available"
            >
              AGENDAR
            </Button>
          </Card>
        </div>
      ) : null}

      <ClientBottomNav />
    </main>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon} size={20} className="text-primary" />
      <h2 className="font-headline text-lg font-semibold">{title}</h2>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <p className="mt-1 truncate font-headline text-xl font-bold">{value}</p>
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-5">
        <div className="h-84 animate-pulse rounded-xl bg-surface-container-low" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
        <div className="h-36 animate-pulse rounded-xl bg-surface-container-low" />
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-surface-container-low" />
    </div>
  )
}
