import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { apiGet, apiPost } from '@/lib/http'
import { buildMockIdToken } from '@/dev/mockSession'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { Client, ClientHealthPayload, ClientStatus, Coach, CoachStatus } from '@/types/api'

const MOCK_COACH_STORAGE_KEY = 'coachmatch:mock:coach'
const MOCK_CLIENT_STORAGE_KEY = 'coachmatch:mock:client'

const APP_ROUTE_GROUPS = [
  {
    title: 'Geral',
    routes: [
      { path: '/', label: 'Entrada' },
      { path: '/dev', label: 'Dev local' },
    ],
  },
  {
    title: 'Aluno',
    routes: [
      { path: '/client/login', label: 'Login Aluno' },
      { path: '/client', label: 'Home Aluno' },
      { path: '/client/onboarding', label: 'Onboarding Aluno' },
      { path: '/client/health', label: 'Saude Aluno' },
    ],
  },
  {
    title: 'Treinador',
    routes: [
      { path: '/coach/login', label: 'Login Treinador' },
      { path: '/coach', label: 'Dashboard Treinador' },
      { path: '/coach/onboarding', label: 'Onboarding Treinador' },
      { path: '/coach/pending-review', label: 'Analise Treinador' },
      { path: '/coach/rejected', label: 'Treinador Rejeitado' },
    ],
  },
  {
    title: 'Auth',
    routes: [
      { path: '/auth/cognito/callback', label: 'Callback Treinador' },
      { path: '/auth/cognito/student/callback', label: 'Callback Aluno' },
    ],
  },
]

const COACH_STATUSES: CoachStatus[] = [
  'ONBOARDING_PROFILE',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
]

const CLIENT_STATUSES: ClientStatus[] = ['ONBOARDING_PROFILE', 'ONBOARDING_HEALTH', 'ACTIVE']

const DEMO_CLIENT_HEALTH: ClientHealthPayload = {
  answers: {
    heart: 'NO',
    chest_pain: 'NO',
    dizziness: 'NO',
    bone_joint: 'NO',
    medication: 'NO',
  },
  notes: '',
  lgpdConsent: true,
  medicalDisclaimer: true,
}

function hasMockingEnabled(): boolean {
  return import.meta.env.VITE_API_MOCKING === 'enabled'
}

function SessionPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${
        active
          ? 'bg-primary text-on-primary-fixed'
          : 'bg-surface-container-high text-on-surface-variant'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-on-primary-fixed' : 'bg-outline'}`} />
      {children}
    </span>
  )
}

function StateBadge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase ${
        active
          ? 'bg-primary text-on-primary-fixed'
          : 'bg-surface-container-high text-on-surface-variant'
      }`}
    >
      {children}
    </span>
  )
}

export default function DevToolsPage() {
  const queryClient = useQueryClient()
  const { activeRole, sessions, startSession } = useSessionStore()
  const resetOnboarding = useOnboardingStore((state) => state.reset)
  const [message, setMessage] = useState('Pronto para preparar um cenario local.')

  const coachMe = useQuery({
    queryKey: ['coachMe'],
    queryFn: () => apiGet<Coach>('/coaches/me'),
    enabled: hasMockingEnabled(),
  })

  const clientMe = useQuery({
    queryKey: ['clientMe'],
    queryFn: () => apiGet<Client>('/clients/me'),
    enabled: hasMockingEnabled(),
  })

  const setCoachStatus = useMutation({
    mutationFn: (status: CoachStatus) => apiPost<Coach>('/dev/coach/status', { status }),
    onSuccess: (coach) => {
      queryClient.setQueryData(['coachMe'], coach)
      setMessage(`Status do treinador mock: ${coach.status}.`)
    },
    onError: () => {
      setMessage('Nao consegui mudar o status. Ligue VITE_API_MOCKING=enabled para usar o MSW.')
    },
  })

  const resetMockState = useMutation({
    mutationFn: () => apiPost<{ coach: Coach; client: Client }>('/dev/reset'),
    onSuccess: ({ coach, client }) => {
      queryClient.setQueryData(['coachMe'], coach)
      queryClient.setQueryData(['clientMe'], client)
      setMessage('State do MSW resetado para os fixtures iniciais.')
    },
    onError: () => {
      setMessage('Nao consegui resetar o MSW. Ligue VITE_API_MOCKING=enabled para usar o painel.')
    },
  })

  const markClientOnboarded = useMutation({
    mutationFn: () => apiPost<Client>('/clients/me/health', DEMO_CLIENT_HEALTH),
    onSuccess: (client) => {
      queryClient.setQueryData(['clientMe'], client)
      setMessage('Aluno marcado como ACTIVE no mock do backend.')
    },
    onError: () => {
      setMessage('Nao consegui marcar o aluno. Ligue VITE_API_MOCKING=enabled para usar o MSW.')
    },
  })

  const setClientOnboarded = useMutation({
    mutationFn: (status: ClientStatus) => apiPost<Client>('/dev/client/onboarded', { status }),
    onSuccess: (client) => {
      queryClient.setQueryData(['clientMe'], client)
      setMessage(`Status do aluno mock: ${client.status}.`)
    },
    onError: () => {
      setMessage(
        'Nao consegui mudar o status do aluno. Ligue VITE_API_MOCKING=enabled para usar o MSW.',
      )
    },
  })

  const hasSession = useMemo(
    () => ({
      client: !!sessions.client?.token,
      coach: !!sessions.coach?.token,
    }),
    [sessions.client?.token, sessions.coach?.token],
  )

  const coachVisibilityLabel = coachMe.data?.visibility ?? 'SEM MOCK'

  function resetLocalStorage() {
    localStorage.removeItem(MOCK_COACH_STORAGE_KEY)
    localStorage.removeItem(MOCK_CLIENT_STORAGE_KEY)
    useSessionStore.setState({ activeRole: null, sessions: {} })
    useSessionStore.persist.clearStorage()
    queryClient.clear()
    resetOnboarding()
  }

  async function resetMockFixtures() {
    if (!hasMockingEnabled()) return null
    return resetMockState.mutateAsync()
  }

  async function prepareLocalClean() {
    resetLocalStorage()
    await resetMockFixtures()
    queryClient.clear()
    setMessage('Sessao, cache, mock do treinador e formulario local limpos.')
  }

  async function prepareClientClean() {
    resetLocalStorage()
    const fixtures = await resetMockFixtures()
    if (fixtures) {
      queryClient.setQueryData(['clientMe'], fixtures.client)
    }
    startSession('client', buildMockIdToken('client'))
    setMessage('Aluno base logado, sem onboarding.')
  }

  async function prepareCoachClean() {
    resetLocalStorage()
    const fixtures = await resetMockFixtures()
    if (fixtures) {
      queryClient.setQueryData(['coachMe'], fixtures.coach)
    } else if (hasMockingEnabled()) {
      await setCoachStatus.mutateAsync('ONBOARDING_PROFILE')
    }
    startSession('coach', buildMockIdToken('coach'))
    setMessage('Treinador base logado, ainda nao aprovado.')
  }

  async function approveCoach() {
    await setCoachStatus.mutateAsync('APPROVED')
  }

  async function refetchCoachMe() {
    await queryClient.invalidateQueries({ queryKey: ['coachMe'] })
    setMessage('Query coachMe invalidada. A proxima tela busca o mock atualizado.')
  }

  return (
    <main className="min-h-dvh bg-surface text-on-surface px-5 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-outline-variant/20 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-headline text-xs font-bold uppercase tracking-[0.3em] text-primary">
              Dev local
            </p>
            <h1 className="mt-3 font-headline text-3xl font-bold md:text-5xl">Painel de estados</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Controle sessoes demo, papel ativo e dados mock sem passar pelo Cognito em cada teste.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SessionPill active={activeRole === 'client'}>Aluno</SessionPill>
            <SessionPill active={activeRole === 'coach'}>Treinador</SessionPill>
          </div>
        </header>

        <Card className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Icon name="terminal" className="mt-0.5 text-primary" />
            <p className="text-sm text-on-surface-variant">{message}</p>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl font-bold">Aluno</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Sessao local e estado real retornado por <code>/clients/me</code>.
                </p>
              </div>
              <Icon name="person" className="text-on-surface-variant" />
            </div>

            <dl className="grid gap-3 text-sm">
              <div className="rounded-lg bg-surface-container p-3">
                <dt className="text-on-surface-variant">Sessao</dt>
                <dd className="mt-1 font-headline font-bold">
                  {hasSession.client ? 'Sessao ativa' : 'Sem sessao'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {CLIENT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setClientOnboarded.mutate(status)
                  }}
                  className={`rounded-lg px-3 py-3 text-left text-xs font-bold uppercase transition-all active:scale-[0.99] ${
                    clientMe.data?.status === status
                      ? 'bg-primary text-on-primary-fixed'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void prepareClientClean()
                }}
                loading={resetMockState.isPending}
              >
                RESET
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  markClientOnboarded.mutate()
                }}
                loading={markClientOnboarded.isPending}
              >
                CONCLUIR ONBOARDING
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl font-bold">Treinador</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Sessao local e status real retornado por <code>/coaches/me</code>.
                </p>
              </div>
              <Icon name="fitness_center" className="text-on-surface-variant" />
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-surface-container p-3">
                <dt className="text-on-surface-variant">Sessao</dt>
                <dd className="mt-1 font-headline font-bold">
                  {hasSession.coach ? 'Sessao ativa' : 'Sem sessao'}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-container p-3">
                <dt className="text-on-surface-variant">Visibilidade</dt>
                <dd className="mt-2">
                  <StateBadge active={coachMe.data?.visibility === 'VISIBLE'}>
                    {coachVisibilityLabel}
                  </StateBadge>
                </dd>
              </div>
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {COACH_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setCoachStatus.mutate(status)
                  }}
                  className={`rounded-lg px-3 py-3 text-left text-xs font-bold uppercase transition-all active:scale-[0.99] ${
                    coachMe.data?.status === status
                      ? 'bg-primary text-on-primary-fixed'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void prepareCoachClean()
                }}
                loading={resetMockState.isPending || setCoachStatus.isPending}
              >
                RESET
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void approveCoach()
                }}
                loading={setCoachStatus.isPending}
              >
                APROVAR
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetchCoachMe()
                }}
              >
                REFRESH COACHME
              </Button>
            </div>
          </Card>
        </section>

        <Card className="p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-headline text-xl font-bold">Ações</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Prepare sessoes e mocks locais para testar os fluxos.
              </p>
            </div>
            <Icon name="tune" className="text-on-surface-variant" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="secondary"
              onClick={() => {
                void prepareLocalClean()
              }}
              loading={resetMockState.isPending}
              icon="delete_sweep"
            >
              LIMPAR LOCAL
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                resetMockState.mutate()
              }}
              loading={resetMockState.isPending}
              icon="restart_alt"
            >
              RESETAR MSW
            </Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 font-headline text-xl font-bold">Rotas da aplicacao</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {APP_ROUTE_GROUPS.map((group) => (
              <div key={group.title} className="rounded-lg bg-surface-container-low p-4">
                <h3 className="mb-3 font-headline text-sm font-bold uppercase text-on-surface-variant">
                  {group.title}
                </h3>
                <div className="grid gap-2">
                  {group.routes.map((route) => (
                    <Link
                      key={route.path}
                      to={route.path}
                      className="group flex min-h-16 items-center justify-between rounded-lg bg-surface-container p-3 text-left transition-all hover:bg-surface-container-high active:scale-[0.99]"
                    >
                      <span className="min-w-0">
                        <span className="block font-headline text-sm font-bold">{route.label}</span>
                        <code className="mt-1 block truncate text-xs text-primary/80">
                          {route.path}
                        </code>
                      </span>
                      <Icon
                        name="arrow_forward"
                        className="shrink-0 text-on-surface-variant transition-all group-hover:translate-x-1 group-hover:text-primary"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
