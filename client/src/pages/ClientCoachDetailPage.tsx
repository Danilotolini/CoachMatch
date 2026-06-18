import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { CrefBadge } from '@/components/coach/CrefBadge'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { getStudentCoachSchedules, requestStudentSchedule } from '@/api/schedule'
import { useCoachDetail } from '@/hooks/useCoachDetail'
import { formatCoachScheduleSlot } from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import type { CoachScheduleSlot } from '@/types/api'
import { buildStudentCoachScheduleWindow } from './clientCoachDetailWindow'

function formatMoney(value: number | string): string {
  const amount = typeof value === 'number' ? value : Number(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSlot(schedule: CoachScheduleSlot): string {
  return formatCoachScheduleSlot(schedule)
}

export default function ClientCoachDetailPage() {
  const { coachId } = useParams<{ coachId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)
  const [successScheduleId, setSuccessScheduleId] = useState<string | null>(null)
  const windowParams = useMemo(() => buildStudentCoachScheduleWindow(), [])
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

  const serviceAreas = useMemo(
    () =>
      (coach?.work_location ?? []).map((location) => {
        if (location.type === 'GYM') {
          const parts = [location.gym?.name, location.gym?.neighborhood, location.gym?.city].filter(
            Boolean,
          )
          return parts.length > 0 ? parts.join(' · ') : 'Academia parceira'
        }
        const { city, state, neighborhoods } = location.coverage
        const where =
          neighborhoods.length > 0
            ? neighborhoods.join(', ')
            : [city, state].filter(Boolean).join(' · ')
        return where ? `Atendimento a domicílio · ${where}` : 'Atendimento a domicílio'
      }),
    [coach],
  )

  const priceLabel = useMemo(() => {
    const prices = availableSchedules
      .map((schedule) => Number(schedule.price))
      .filter((value) => Number.isFinite(value) && value > 0)
    return prices.length > 0 ? formatMoney(Math.min(...prices)) : null
  }, [availableSchedules])

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
              {coach?.profile.name ?? 'Detalhes'}
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
                  <div className="relative min-h-84 bg-surface-container">
                    <div className="kinetic-grid absolute inset-0" />
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-surface-container-lowest via-surface-container-lowest/72 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <CrefBadge />
                      </div>
                      <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                        {coach.profile.name}
                      </h2>
                      {coach.profile.instagram ? (
                        <p className="mt-2 font-body text-sm text-on-surface-variant">
                          {coach.profile.instagram}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon="fitness_center" title="Especialidades" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {coach.profile.specialties.map((specialty) => (
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
                    {serviceAreas.length > 0 ? (
                      serviceAreas.map((area) => (
                        <div
                          key={area}
                          className="flex items-center gap-3 rounded-lg bg-surface-container px-3 py-3"
                        >
                          <Icon name="pin_drop" size={18} className="text-primary" />
                          <span className="font-body text-sm text-on-surface-variant">{area}</span>
                        </div>
                      ))
                    ) : (
                      <p className="font-body text-sm text-on-surface-variant">
                        O treinador ainda não informou locais de atendimento.
                      </p>
                    )}
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
                    {priceLabel ? (
                      <div className="rounded-lg bg-primary px-3 py-2 text-on-primary-fixed">
                        <p className="font-headline text-lg font-bold">{priceLabel}</p>
                        <p className="font-label text-[10px] font-medium uppercase">sessão</p>
                      </div>
                    ) : null}
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
