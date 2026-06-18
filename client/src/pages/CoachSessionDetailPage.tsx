import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { fetchCoachStudentDetail } from '@/api/coaches'
import { getCoachScheduleRequests } from '@/api/schedule'
import { StartChatButton } from '@/components/chat/StartChatButton'
import { CoachBottomNav, CoachSideNav } from '@/components/layout/CoachNavigation'
import { SessionSummaryCard } from '@/components/schedule/SessionSummaryCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Icon } from '@/components/ui/Icon'
import {
  useApproveCoachScheduleRequest,
  useCancelCoachSchedule,
  useCoachSchedule,
} from '@/hooks/useCoachSchedule'
import { useGyms } from '@/hooks/useGyms'
import { useSpecialties } from '@/hooks/useSpecialties'
import { getToken } from '@/lib/auth'
import { ageFromBirthDate, GENDER_LABELS, GOAL_LABELS, PARQ } from '@/lib/health'
import { parseApiErrors } from '@/lib/http'
import type { CoachStudentDetail, Schedule } from '@/types/api'

const RANGE_START = '2020-01-01'
const RANGE_END = '2035-12-31'

function canCancelSchedule(slot: Schedule): boolean {
  return slot.status !== 'COMPLETED' && slot.status !== 'NOSHOW' && slot.status !== 'CANCELLED'
}

function StudentSection({
  studentId,
  hasStudent,
  fallbackName,
  action,
  chatPeerId,
}: {
  studentId: string | null
  hasStudent: boolean
  fallbackName?: string | null | undefined
  action?: ReactNode
  chatPeerId?: string | undefined
}) {
  const query = useQuery({
    queryKey: ['coach-student-detail', studentId],
    queryFn: () => fetchCoachStudentDetail(studentId ?? ''),
    enabled: !!studentId,
    staleTime: 60 * 1000,
  })

  if (!hasStudent) {
    return (
      <Card className="p-5">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Aluno
        </h2>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Esta sessão ainda não tem aluno confirmado.
        </p>
      </Card>
    )
  }

  if (query.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-container-low" />
  }

  if (query.isError || !query.data) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Aluno
            </span>
            <p className="mt-0.5 font-headline text-lg font-semibold tracking-tight text-on-surface">
              {fallbackName ?? 'Aluno'}
            </p>
          </div>
          {action}
        </div>
        <p className="font-body text-sm text-on-surface-variant">
          {parseApiErrors(query.error, 'Não foi possível carregar os dados do aluno.')}
        </p>
      </Card>
    )
  }

  const resolvedAction =
    action ??
    (chatPeerId ? (
      <StartChatButton
        role="coach"
        peerId={chatPeerId}
        peerName={query.data.name}
        chatPath="/coach/chat"
      />
    ) : undefined)

  return <StudentDetail detail={query.data} action={resolvedAction} />
}

function StudentDetail({ detail, action }: { detail: CoachStudentDetail; action?: ReactNode }) {
  const age = ageFromBirthDate(detail.birthDate)
  const meta = [
    detail.gender ? GENDER_LABELS[detail.gender] : null,
    age !== null ? `${String(age)} anos` : null,
    detail.goal ? GOAL_LABELS[detail.goal] : null,
  ].filter(Boolean)
  const health = detail.health

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Aluno
          </span>
          <p className="mt-0.5 font-headline text-lg font-semibold tracking-tight text-on-surface">
            {detail.name ?? 'Aluno'}
          </p>
          {meta.length > 0 && (
            <p className="mt-1 font-body text-sm text-on-surface-variant">{meta.join(' · ')}</p>
          )}
        </div>
        {action}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Questionário de saúde (PAR-Q)
        </h3>
        {!health ? (
          <p className="rounded-lg bg-surface-container-low px-4 py-3 font-body text-sm text-on-surface-variant">
            O aluno ainda não respondeu o questionário de saúde.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {PARQ.map((question) => {
                const answer = health.answers[question.id]
                const flagged = answer === 'YES'
                return (
                  <li
                    key={question.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-4 py-2.5"
                  >
                    <span className="min-w-0 font-body text-sm text-on-surface">
                      {question.short}
                    </span>
                    <span
                      className={`flex shrink-0 items-center gap-1 font-label text-xs font-bold uppercase ${
                        flagged ? 'text-error' : 'text-on-surface-variant'
                      }`}
                    >
                      <Icon name={flagged ? 'warning' : 'check'} size={14} />
                      {flagged ? 'Sim' : 'Não'}
                    </span>
                  </li>
                )
              })}
            </ul>

            {health.notes && (
              <div className="rounded-lg bg-surface-container-low px-4 py-3">
                <span className="font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Observações
                </span>
                <p className="mt-1 whitespace-pre-line font-body text-sm text-on-surface">
                  {health.notes}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

function RequestsSection({ slot }: { slot: Schedule }) {
  const approveMutation = useApproveCoachScheduleRequest()
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestsQuery = useQuery({
    queryKey: ['coachScheduleRequests', slot.scheduleId],
    queryFn: () => getCoachScheduleRequests(slot.scheduleId),
    enabled: !!getToken(),
    staleTime: 20 * 1000,
  })

  // O endpoint da agenda não traz o nome do aluno; o de requests enriquece.
  const pending = (requestsQuery.data?.requests ?? slot.requests ?? []).filter(
    (request) => request.status === 'REQUESTED',
  )

  async function handleApprove(studentId: string) {
    setBusyStudentId(studentId)
    setError(null)
    try {
      await approveMutation.mutateAsync({ scheduleId: slot.scheduleId, studentId })
    } catch (e) {
      setError(parseApiErrors(e, 'Não foi possível aprovar a solicitação.'))
    } finally {
      setBusyStudentId(null)
    }
  }

  if (requestsQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-surface-container-low" />
  }

  if (pending.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Solicitações
        </h2>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          Nenhuma solicitação pendente para esta sessão.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-headline text-base font-semibold tracking-tight text-on-surface">
          Solicitações pendentes
        </h2>
        <span className="font-label text-xs text-on-surface-variant">
          {pending.length} {pending.length === 1 ? 'aluno' : 'alunos'}
        </span>
      </div>
      {error && <p className="font-label text-xs text-error">{error}</p>}
      {pending.map((request) => (
        <StudentSection
          key={request.studentId}
          studentId={request.studentId}
          hasStudent
          fallbackName={request.studentName}
          action={
            <Button
              type="button"
              icon="check"
              disabled={busyStudentId !== null}
              onClick={() => {
                void handleApprove(request.studentId)
              }}
              className="shrink-0"
            >
              {busyStudentId === request.studentId ? 'APROVANDO…' : 'APROVAR'}
            </Button>
          }
        />
      ))}
    </div>
  )
}

function CancelSessionButton({ slot }: { slot: Schedule }) {
  const navigate = useNavigate()
  const cancelMutation = useCancelCoachSchedule()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canCancelSchedule(slot)) return null

  async function runCancel() {
    setError(null)
    try {
      await cancelMutation.mutateAsync(slot.scheduleId)
      setConfirming(false)
      void navigate('/coach/schedule')
    } catch (e) {
      setConfirming(false)
      setError(parseApiErrors(e, 'Não foi possível cancelar a sessão.'))
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Ações
      </span>
      <p className="font-body text-sm text-on-surface-variant">
        Ao cancelar, o horário fica indisponível e os alunos envolvidos são notificados.
      </p>
      <Button
        type="button"
        variant="secondary"
        icon="event_busy"
        disabled={cancelMutation.isPending}
        onClick={() => {
          setConfirming(true)
        }}
        className="w-full sm:w-auto"
      >
        CANCELAR SESSÃO
      </Button>
      {error && <p className="font-label text-xs text-error">{error}</p>}

      {confirming && (
        <ConfirmDialog
          title="Cancelar sessão?"
          description="O horário ficará indisponível e os alunos serão notificados. Esta ação não pode ser desfeita."
          confirmLabel="CANCELAR SESSÃO"
          cancelLabel="MANTER"
          tone="danger"
          busy={cancelMutation.isPending}
          onConfirm={() => {
            void runCancel()
          }}
          onClose={() => {
            setConfirming(false)
          }}
        />
      )}
    </Card>
  )
}

export default function CoachSessionDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()
  const scheduleQuery = useCoachSchedule(RANGE_START, RANGE_END)
  const { data: specialtiesData } = useSpecialties()
  const { data: gymsData } = useGyms()

  const slot: Schedule | undefined = useMemo(
    () => (scheduleQuery.data ?? []).find((s) => s.scheduleId === scheduleId),
    [scheduleQuery.data, scheduleId],
  )

  const specialtyLabel = useMemo(() => {
    if (!slot) return ''
    const found = (specialtiesData?.data ?? []).find((s) => s.id === slot.specialtyId)
    return found?.label ?? slot.specialtyId
  }, [slot, specialtiesData?.data])

  const gymLabel = useMemo(() => {
    if (!slot) return undefined
    const gym = (gymsData?.data ?? []).find((g) => g.gymId === slot.gymId)
    if (!gym) return slot.gymId
    const location = [gym.neighborhood, gym.city].filter(Boolean).join(', ')
    return location ? `${gym.name} · ${location}` : gym.name
  }, [slot, gymsData?.data])

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="flex items-center gap-3 px-6 py-6 md:px-12 lg:px-10 lg:py-8">
          <button
            type="button"
            onClick={() => void navigate(-1)}
            aria-label="Voltar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" size={21} />
          </button>
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Treinador
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">
              Detalhes da sessão
            </h1>
          </div>
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
              <SessionSummaryCard
                slot={slot}
                specialtyLabel={specialtyLabel}
                gymLabel={gymLabel}
                showPayment={false}
              />
              {slot.status === 'REQUESTED' ? (
                <RequestsSection slot={slot} />
              ) : (
                <StudentSection
                  studentId={slot.studentId}
                  hasStudent={!!slot.studentId}
                  chatPeerId={slot.studentId ?? undefined}
                />
              )}
              <CancelSessionButton slot={slot} />
            </>
          )}
        </section>
      </div>

      <CoachBottomNav />
    </main>
  )
}
