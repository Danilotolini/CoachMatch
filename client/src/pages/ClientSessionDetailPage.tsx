import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { getStudentScheduleRequests } from '@/api/schedule'
import { StartChatButton } from '@/components/chat/StartChatButton'
import { InstagramLink } from '@/components/coach/InstagramLink'
import { StudentPaymentSimulator } from '@/components/client/StudentPaymentSimulator'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import { SessionSummaryCard } from '@/components/schedule/SessionSummaryCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import { useCoachDetail } from '@/hooks/useCoachDetail'
import {
  useCancelStudentSchedule,
  useCancelStudentScheduleRequest,
} from '@/hooks/useStudentSchedule'
import { useStudentSpecialties } from '@/hooks/useStudentSpecialties'
import { formatScheduleDateTimeRange, nowMs } from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import type { CoachDetail, Schedule, StudentScheduleItem } from '@/types/api'

// Janela mínima para o aluno cancelar uma sessão confirmada (espelha a lambda).
const CANCEL_WINDOW_HOURS = 6

function startsWithinCancelWindow(startDateTime: string): boolean {
  return new Date(startDateTime).getTime() <= nowMs() + CANCEL_WINDOW_HOURS * 60 * 60 * 1000
}

function toSchedule(item: StudentScheduleItem, studentId: string): Schedule {
  return {
    scheduleId: item.scheduleId,
    coachId: item.coachId,
    gymId: item.gymId,
    specialtyId: item.specialtyId,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    price: item.price,
    status: item.scheduleStatus,
    studentId,
    paymentStatus: item.paymentStatus ?? null,
    rating: null,
    studentComment: null,
    requests: item.request ? [item.request] : null,
    createdAt: '',
    updatedAt: '',
  }
}

function CoachSection({ slot }: { slot: Schedule }) {
  const query = useCoachDetail(slot.coachId)

  if (query.isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-container-low" />
  }

  if (query.isError || !query.data) {
    return (
      <Card className="p-5">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Treinador
        </h2>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          {parseApiErrors(query.error, 'Não foi possível carregar os dados do treinador.')}
        </p>
      </Card>
    )
  }

  return <CoachDetailView detail={query.data} gymId={slot.gymId} coachId={slot.coachId} />
}

function CoachDetailView({
  detail,
  gymId,
  coachId,
}: {
  detail: CoachDetail
  gymId: string
  coachId: string
}) {
  const { profile } = detail
  const gym = useMemo(() => {
    const match = detail.work_location.find(
      (location) => location.type === 'GYM' && location.gymId === gymId,
    )
    return match?.type === 'GYM' ? match.gym : null
  }, [detail.work_location, gymId])

  const gymLocation = gym
    ? [gym.neighborhood, gym.city, gym.state].filter(Boolean).join(', ')
    : null

  return (
    <>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Treinador
            </span>
            <p className="mt-0.5 font-headline text-lg font-semibold tracking-tight text-on-surface">
              {profile.name}
            </p>
            {profile.specialties.length > 0 && (
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                {profile.specialties.join(' · ')}
              </p>
            )}
          </div>
          <StartChatButton
            role="client"
            peerId={coachId}
            peerName={profile.name}
            chatPath="/client/chat"
          />
        </div>
        <div className="flex flex-col gap-2.5 rounded-lg bg-surface-container-low p-4">
          {profile.cref && (
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-label text-xs text-on-surface-variant">CREF</span>
              <span className="font-label text-sm font-medium text-on-surface">{profile.cref}</span>
            </div>
          )}
          {profile.instagram && (
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-label text-xs text-on-surface-variant">Instagram</span>
              <InstagramLink
                handle={profile.instagram}
                className="font-label text-sm font-medium text-on-surface transition-colors hover:text-primary"
              />
            </div>
          )}
          {profile.phone && (
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-label text-xs text-on-surface-variant">Telefone</span>
              <span className="font-label text-sm font-medium text-on-surface">
                {profile.phone}
              </span>
            </div>
          )}
        </div>
      </Card>

      {gym && (
        <Card className="flex flex-col gap-2 p-5">
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Academia
          </span>
          <p className="font-headline text-base font-semibold tracking-tight text-on-surface">
            {gym.name ?? 'Academia'}
          </p>
          {gymLocation && (
            <p className="flex items-center gap-1.5 font-body text-sm text-on-surface-variant">
              <Icon name="location_on" size={16} />
              {gymLocation}
            </p>
          )}
        </Card>
      )}
    </>
  )
}

type ActionKind = 'request' | 'session'

function StudentSessionActions({ slot, onCancelled }: { slot: Schedule; onCancelled: () => void }) {
  const cancelRequest = useCancelStudentScheduleRequest()
  const cancelSession = useCancelStudentSchedule()
  const [confirming, setConfirming] = useState<ActionKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ownRequest = slot.requests?.[0]
  const canCancelRequest = slot.status === 'REQUESTED' && ownRequest?.status === 'REQUESTED'
  const isBooked = slot.status === 'BOOKED'
  const startsSoon = startsWithinCancelWindow(slot.startDateTime)

  if (!canCancelRequest && !isBooked) return null

  const busy = cancelRequest.isPending || cancelSession.isPending

  async function runCancel(kind: ActionKind) {
    setError(null)
    try {
      if (kind === 'request') {
        await cancelRequest.mutateAsync(slot.scheduleId)
      } else {
        await cancelSession.mutateAsync(slot.scheduleId)
      }
      setConfirming(null)
      onCancelled()
    } catch (e) {
      setConfirming(null)
      setError(
        parseApiErrors(
          e,
          kind === 'request'
            ? 'Não foi possível cancelar o pedido.'
            : 'Não foi possível cancelar a sessão.',
        ),
      )
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Ações
      </span>

      {canCancelRequest ? (
        <>
          <p className="font-body text-sm text-on-surface-variant">
            Você ainda pode retirar este pedido enquanto o treinador não responde.
          </p>
          <Button
            type="button"
            variant="secondary"
            icon="close"
            disabled={busy}
            onClick={() => {
              setConfirming('request')
            }}
            className="w-full sm:w-auto"
          >
            CANCELAR PEDIDO
          </Button>
        </>
      ) : (
        <>
          <p className="font-body text-sm text-on-surface-variant">
            {startsSoon
              ? 'Não é possível cancelar: a sessão começa em menos de 6 horas.'
              : 'Cancele a sessão com pelo menos 6 horas de antecedência.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            icon="event_busy"
            disabled={busy || startsSoon}
            onClick={() => {
              setConfirming('session')
            }}
            className="w-full sm:w-auto"
          >
            CANCELAR SESSÃO
          </Button>
        </>
      )}

      {error && <p className="font-label text-xs text-error">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title={confirming === 'request' ? 'Cancelar pedido?' : 'Cancelar sessão?'}
          description={
            confirming === 'request'
              ? 'Seu pedido será retirado e o horário voltará a ficar disponível.'
              : 'A sessão será cancelada e o treinador será notificado. Esta ação não pode ser desfeita.'
          }
          confirmLabel={confirming === 'request' ? 'CANCELAR PEDIDO' : 'CANCELAR SESSÃO'}
          cancelLabel="VOLTAR"
          tone="danger"
          busy={busy}
          onConfirm={() => {
            void runCancel(confirming)
          }}
          onClose={() => {
            setConfirming(null)
          }}
        />
      )}
    </Card>
  )
}

function formatMoney(value: string): string {
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount)
}

function StudentPaymentSection({
  slot,
  studentId,
  specialtyLabel,
  onPaid,
}: {
  slot: Schedule
  studentId: string
  specialtyLabel: string
  onPaid: () => void
}) {
  const canPay = slot.status === 'BOOKED' && slot.paymentStatus !== 'PAID'
  if (!canPay) return null

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Pagamento
      </span>
      <StudentPaymentSimulator
        scheduleId={slot.scheduleId}
        coachId={slot.coachId}
        studentId={studentId}
        amountCents={Math.round(parseFloat(slot.price) * 100)}
        amountLabel={formatMoney(slot.price)}
        specialtyLabel={specialtyLabel}
        dateLabel={formatScheduleDateTimeRange(slot)}
        onPaid={onPaid}
      />
    </Card>
  )
}

export default function ClientSessionDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()
  const scheduleQuery = useQuery({
    queryKey: ['student-schedule-requests'],
    queryFn: getStudentScheduleRequests,
    staleTime: 20 * 1000,
  })
  const specialtiesQuery = useStudentSpecialties()

  const studentId = scheduleQuery.data?.studentId ?? ''
  const item = useMemo(
    () => (scheduleQuery.data?.schedules ?? []).find((s) => s.scheduleId === scheduleId),
    [scheduleQuery.data, scheduleId],
  )
  const slot = useMemo(() => (item ? toSchedule(item, studentId) : undefined), [item, studentId])
  const specialtyLabel = useMemo(() => {
    if (!slot) return ''
    const found = (specialtiesQuery.data?.data ?? []).find((s) => s.id === slot.specialtyId)
    return found?.label ?? slot.specialtyId
  }, [slot, specialtiesQuery.data])

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="flex items-center gap-3 px-4 py-4 sm:px-6 md:px-10 lg:py-8">
          <button
            type="button"
            onClick={() => void navigate(-1)}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" size={21} />
          </button>
          <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">
            Detalhes da sessão
          </h1>
        </header>

        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pb-12 sm:px-6 md:px-10">
          {scheduleQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-surface-container-low" />
          ) : !slot ? (
            <Card className="p-6 text-center">
              <Icon name="event_busy" size={34} className="mx-auto mb-3 text-primary" />
              <h2 className="font-headline text-xl font-semibold">Sessão não encontrada</h2>
              <p className="mt-2 font-body text-sm text-on-surface-variant">
                Esta sessão não está mais disponível na sua agenda.
              </p>
            </Card>
          ) : (
            <>
              <SessionSummaryCard slot={slot} specialtyLabel={specialtyLabel} />
              <StudentPaymentSection
                slot={slot}
                studentId={studentId}
                specialtyLabel={specialtyLabel}
                onPaid={() => {
                  void scheduleQuery.refetch()
                }}
              />
              <StudentSessionActions
                slot={slot}
                onCancelled={() => {
                  void navigate('/client/schedule')
                }}
              />
              <CoachSection slot={slot} />
            </>
          )}
        </section>
      </div>

      <ClientBottomNav />
    </main>
  )
}
