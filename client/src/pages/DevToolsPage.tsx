import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { apiGet, apiPost } from '@/lib/http'
import { logout } from '@/lib/cognito'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { Client, ClientStatus, Coach, CoachStatus } from '@/types/api'

const MOCK_COACH_STORAGE_KEY = 'coachmatch:mock:coach'
const MOCK_CLIENT_STORAGE_KEY = 'coachmatch:mock:client'

const APP_ROUTE_GROUPS = [
  {
    title: 'Aluno',
    routes: [
      { path: '/client', label: 'Home Aluno' },
      { path: '/client/onboarding', label: 'Criacao Perfil Aluno' },
      { path: '/client/health', label: 'Saude Aluno' },
    ],
  },
  {
    title: 'Treinador',
    routes: [
      { path: '/coach', label: 'Home Treinador' },
      { path: '/coach/onboarding', label: 'Criacao Perfil Treinador' },
    ],
  },
]

const COACH_STATUSES: CoachStatus[] = ['PENDING_PROFILE', 'APPROVED']

const CLIENT_STATUSES: ClientStatus[] = ['PENDING_PROFILE', 'ONBOARDING_HEALTH', 'ACTIVE']

function hasMockingEnabled(): boolean {
  return import.meta.env.VITE_API_MOCKING === 'enabled'
}

function Pill({
  active,
  dot = false,
  children,
}: {
  active: boolean
  dot?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ${
        active
          ? 'bg-primary text-on-primary-fixed'
          : 'bg-surface-container-high text-on-surface-variant'
      }`}
    >
      {dot && (
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-on-primary-fixed' : 'bg-outline'}`} />
      )}
      {children}
    </span>
  )
}

function StatusGrid<T extends string>({
  statuses,
  current,
  onSelect,
  className = '',
}: {
  statuses: readonly T[]
  current?: T | undefined
  onSelect: (status: T) => void
  className?: string
}) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => {
            onSelect(status)
          }}
          className={`wrap-break-word rounded-lg px-2 py-3 text-center text-[11px] font-bold uppercase leading-tight transition-all active:scale-[0.99] ${
            current === status
              ? 'bg-primary text-on-primary-fixed'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  )
}

export default function DevToolsPage() {
  const queryClient = useQueryClient()
  const { sessions, endSession } = useSessionStore()
  const resetOnboarding = useOnboardingStore((state) => state.reset)
  const [message, setMessage] = useState('Pronto para preparar um cenario local.')

  const coachMe = useQuery({
    queryKey: ['coachMe'],
    queryFn: () => apiGet<Coach>('/coach/me'),
    enabled: hasMockingEnabled(),
  })

  const clientMe = useQuery({
    queryKey: ['clientMe'],
    queryFn: () => apiGet<Client>('/student/me'),
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

  function clearRoleLocal(role: 'client' | 'coach') {
    endSession(role)
    if (role === 'coach') {
      localStorage.removeItem(MOCK_COACH_STORAGE_KEY)
      queryClient.removeQueries({ queryKey: ['coachMe'] })
    } else {
      localStorage.removeItem(MOCK_CLIENT_STORAGE_KEY)
      queryClient.removeQueries({ queryKey: ['clientMe'] })
      resetOnboarding()
    }
    setMessage(`Estado local do ${role === 'coach' ? 'treinador' : 'aluno'} limpo.`)
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
          </div>
        </header>

        <Card className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Icon name="terminal" className="mt-0.5 text-primary" />
            <p className="text-sm text-on-surface-variant">{message}</p>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 font-headline text-xl font-bold">Sessões</h2>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-headline text-lg font-bold">Aluno</h3>
                <Pill active={hasSession.client}>
                  {hasSession.client ? 'Sessao ativa' : 'Sem sessao'}
                </Pill>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    logout('client')
                  }}
                  disabled={!hasSession.client}
                >
                  DESLOGAR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearRoleLocal('client')
                  }}
                >
                  LIMPAR LOCAL
                </Button>
              </div>

              <StatusGrid
                className="mt-3"
                statuses={CLIENT_STATUSES}
                current={clientMe.data?.status}
                onSelect={(status) => {
                  setClientOnboarded.mutate(status)
                }}
              />
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-headline text-lg font-bold">Treinador</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill active={hasSession.coach}>
                    {hasSession.coach ? 'Sessao ativa' : 'Sem sessao'}
                  </Pill>
                  {hasSession.coach && (
                    <Pill active={coachMe.data?.visibility === 'VISIBLE'}>
                      {coachVisibilityLabel}
                    </Pill>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    logout('coach')
                  }}
                  disabled={!hasSession.coach}
                >
                  DESLOGAR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearRoleLocal('coach')
                  }}
                >
                  LIMPAR LOCAL
                </Button>
              </div>

              <StatusGrid
                className="mt-3"
                statuses={COACH_STATUSES}
                current={coachMe.data?.status}
                onSelect={(status) => {
                  setCoachStatus.mutate(status)
                }}
              />
            </Card>
          </div>
        </section>

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
