import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { apiGet, apiPost, apiPut } from '@/lib/http'
import { buildMockIdToken } from '@/dev/mockSession'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { type Role, useSessionStore } from '@/stores/sessionStore'
import type { Coach, CoachStatus, CoachUpdatePayload, WorkLocation } from '@/types/api'

const MOCK_COACH_STORAGE_KEY = 'coachmatch:mock:coach'

const QUICK_ROUTES = [
  { path: '/client', label: 'Home Aluno', role: 'client' as const },
  { path: '/client/onboarding', label: 'Onboarding Aluno', role: 'client' as const },
  { path: '/client/health', label: 'Saude Aluno', role: 'client' as const },
  { path: '/coach', label: 'Dashboard Treinador', role: 'coach' as const },
  { path: '/coach/onboarding', label: 'Onboarding Treinador', role: 'coach' as const },
  { path: '/coach/pending-review', label: 'Analise Treinador', role: 'coach' as const },
]

const COACH_STATUSES: { status: CoachStatus; label: string }[] = [
  { status: 'PENDING_PROFILE', label: 'Perfil pendente' },
  { status: 'PROFILE_REVIEW', label: 'Em analise' },
  { status: 'APPROVED', label: 'Aprovado' },
  { status: 'REJECTED', label: 'Rejeitado' },
]

const DEMO_WORK_LOCATION: WorkLocation[] = [
  { type: 'GYM', gymId: 'gym_smartfit_paulista' },
  {
    type: 'HOME_SERVICE',
    coverage: {
      city: 'São Paulo',
      state: 'SP',
      neighborhoods: ['Bela Vista', 'Pinheiros'],
    },
  },
]

interface CoachProfileForm {
  name: string
  phone: string
  cref: string
  instagram: string
  specialties: string
  profileVideo: boolean
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

export default function DevToolsPage() {
  const queryClient = useQueryClient()
  const { activeRole, sessions, startSession, endSession, setActiveRole, markClientOnboarded } =
    useSessionStore()
  const resetOnboarding = useOnboardingStore((state) => state.reset)
  const [message, setMessage] = useState('Pronto para preparar um cenario local.')
  const [profileForm, setProfileForm] = useState<CoachProfileForm>({
    name: 'Treinador Demo',
    phone: '11999998888',
    cref: '123456-G/SP',
    instagram: '@treinador.demo',
    specialties: 'Musculação, Funcional',
    profileVideo: true,
  })

  const coachMe = useQuery({
    queryKey: ['coachMe'],
    queryFn: () => apiGet<Coach>('/coaches/me'),
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

  const saveCoachProfile = useMutation({
    mutationFn: (payload: CoachUpdatePayload) => apiPut<Coach>('/dev/coach/profile', payload),
    onSuccess: (coach) => {
      queryClient.setQueryData(['coachMe'], coach)
      setMessage('Perfil demo salvo no mock local.')
    },
    onError: () => {
      setMessage('Nao consegui salvar o perfil demo. Verifique se o MSW esta ligado.')
    },
  })

  const resetMockState = useMutation({
    mutationFn: () => apiPost<{ coach: Coach }>('/dev/reset'),
    onSuccess: ({ coach }) => {
      queryClient.setQueryData(['coachMe'], coach)
      setMessage('State do MSW resetado para os fixtures iniciais.')
    },
    onError: () => {
      setMessage('Nao consegui resetar o MSW. Ligue VITE_API_MOCKING=enabled para usar o painel.')
    },
  })

  const hasSession = useMemo(
    () => ({
      client: !!sessions.client?.token,
      coach: !!sessions.coach?.token,
    }),
    [sessions.client?.token, sessions.coach?.token],
  )

  function seedDemoSessions(nextActiveRole: Role = activeRole ?? 'client') {
    startSession('coach', buildMockIdToken('coach'))
    startSession('client', buildMockIdToken('client'))
    setActiveRole(nextActiveRole)
    setMessage(
      `Sessoes demo criadas. Visao ativa: ${nextActiveRole === 'client' ? 'Aluno' : 'Treinador'}.`,
    )
  }

  function switchRole(role: Role) {
    if (!hasSession[role]) {
      startSession(role, buildMockIdToken(role))
    }
    setActiveRole(role)
    setMessage(`Visao ativa: ${role === 'client' ? 'Aluno' : 'Treinador'}.`)
  }

  function clearSession(role: Role) {
    endSession(role)
    setMessage(`Sessao de ${role === 'client' ? 'Aluno' : 'Treinador'} limpa.`)
  }

  function clearLocalState() {
    localStorage.removeItem('coachmatch:session')
    localStorage.removeItem(MOCK_COACH_STORAGE_KEY)
    useSessionStore.setState({ activeRole: null, sessions: {} })
    queryClient.clear()
    resetOnboarding()
    setMessage('Sessao, cache, mock do treinador e formulario local limpos.')
  }

  async function approveCoach() {
    await setCoachStatus.mutateAsync('APPROVED')
  }

  function prepareRoute(role: Role) {
    switchRole(role)
  }

  function clearQueryCache() {
    queryClient.clear()
    setMessage('Cache do TanStack Query limpo.')
  }

  async function refetchCoachMe() {
    await queryClient.invalidateQueries({ queryKey: ['coachMe'] })
    setMessage('Query coachMe invalidada. A proxima tela busca o mock atualizado.')
  }

  function updateProfileForm<K extends keyof CoachProfileForm>(key: K, value: CoachProfileForm[K]) {
    setProfileForm((current) => ({ ...current, [key]: value }))
  }

  function saveDemoProfile() {
    const specialties = profileForm.specialties
      .split(',')
      .map((specialty) => specialty.trim())
      .filter(Boolean)

    saveCoachProfile.mutate({
      profile: {
        name: profileForm.name,
        phone: profileForm.phone,
        cref: profileForm.cref,
        instagram: profileForm.instagram,
        specialties,
        profile_video: profileForm.profileVideo,
      },
      work_location: DEMO_WORK_LOCATION,
    })
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

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl font-bold">Sessoes demo</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Tokens locais com Aluno Demo e Treinador Demo.
                </p>
              </div>
              <Icon name="badge" className="text-on-surface-variant" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => {
                  seedDemoSessions('client')
                }}
                icon="person"
              >
                ENTRAR COMO ALUNO
              </Button>
              <Button
                onClick={() => {
                  seedDemoSessions('coach')
                }}
                icon="fitness_center"
              >
                ENTRAR COMO TREINADOR
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  switchRole('client')
                }}
              >
                TROCAR PARA ALUNO
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  switchRole('coach')
                }}
              >
                TROCAR PARA TREINADOR
              </Button>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-surface-container p-3">
                <dt className="text-on-surface-variant">Aluno</dt>
                <dd className="mt-1 font-headline font-bold">
                  {hasSession.client ? 'Sessao ativa' : 'Sem sessao'}
                </dd>
              </div>
              <div className="rounded-lg bg-surface-container p-3">
                <dt className="text-on-surface-variant">Treinador</dt>
                <dd className="mt-1 font-headline font-bold">
                  {hasSession.coach ? 'Sessao ativa' : 'Sem sessao'}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-xl font-bold">Reset e mocks</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Volte para estados limpos ou pule revisoes manuais.
                </p>
              </div>
              <Icon name="tune" className="text-on-surface-variant" />
            </div>

            <div className="grid gap-3">
              <Button variant="secondary" onClick={markClientOnboarded} icon="task_alt">
                MARCAR ALUNO ONBOARDED
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void approveCoach()
                }}
                loading={setCoachStatus.isPending}
                icon="verified"
              >
                APROVAR TREINADOR MOCK
              </Button>
              <div className="grid grid-cols-2 gap-2">
                {COACH_STATUSES.map(({ status, label }) => (
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
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    void refetchCoachMe()
                  }}
                >
                  REFRESH COACHME
                </Button>
                <Button variant="ghost" onClick={clearQueryCache}>
                  LIMPAR CACHE
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearSession('client')
                  }}
                >
                  LIMPAR ALUNO
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearSession('coach')
                  }}
                >
                  LIMPAR TREINADOR
                </Button>
              </div>
              <Button variant="secondary" onClick={clearLocalState} icon="delete_sweep">
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
        </section>

        <Card className="p-5">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-headline text-xl font-bold">Perfil demo do treinador</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Salva no MSW e no localStorage para testar dashboard, review e reabertura da rota.
              </p>
            </div>
            <SessionPill active={!!coachMe.data}>{coachMe.data?.status ?? 'Sem mock'}</SessionPill>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-on-surface-variant">
              Nome
              <input
                value={profileForm.name}
                onChange={(event) => {
                  updateProfileForm('name', event.target.value)
                }}
                className="rounded-lg border-outline-variant/30 bg-surface-container text-on-surface"
              />
            </label>
            <label className="grid gap-2 text-sm text-on-surface-variant">
              Telefone
              <input
                value={profileForm.phone}
                onChange={(event) => {
                  updateProfileForm('phone', event.target.value)
                }}
                className="rounded-lg border-outline-variant/30 bg-surface-container text-on-surface"
              />
            </label>
            <label className="grid gap-2 text-sm text-on-surface-variant">
              CREF
              <input
                value={profileForm.cref}
                onChange={(event) => {
                  updateProfileForm('cref', event.target.value)
                }}
                className="rounded-lg border-outline-variant/30 bg-surface-container text-on-surface"
              />
            </label>
            <label className="grid gap-2 text-sm text-on-surface-variant">
              Instagram
              <input
                value={profileForm.instagram}
                onChange={(event) => {
                  updateProfileForm('instagram', event.target.value)
                }}
                className="rounded-lg border-outline-variant/30 bg-surface-container text-on-surface"
              />
            </label>
            <label className="grid gap-2 text-sm text-on-surface-variant md:col-span-2">
              Especialidades
              <input
                value={profileForm.specialties}
                onChange={(event) => {
                  updateProfileForm('specialties', event.target.value)
                }}
                className="rounded-lg border-outline-variant/30 bg-surface-container text-on-surface"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="inline-flex items-center gap-3 text-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={profileForm.profileVideo}
                onChange={(event) => {
                  updateProfileForm('profileVideo', event.target.checked)
                }}
                className="rounded border-outline-variant/40 bg-surface-container text-primary"
              />
              Video de perfil enviado
            </label>
            <Button
              onClick={saveDemoProfile}
              loading={saveCoachProfile.isPending}
              icon="save"
              className="md:min-w-56"
            >
              SALVAR PERFIL
            </Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 font-headline text-xl font-bold">Atalhos com contexto</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {QUICK_ROUTES.map((route) => (
              <a
                key={route.path}
                href={route.path}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  prepareRoute(route.role)
                }}
                className="group flex min-h-24 items-center justify-between rounded-lg bg-surface-container-low p-4 text-left transition-all hover:bg-surface-container-high active:scale-[0.99]"
              >
                <span>
                  <span className="block font-headline font-bold">{route.label}</span>
                  <code className="mt-2 block text-xs text-primary/80">{route.path}</code>
                </span>
                <Icon
                  name="arrow_forward"
                  className="text-on-surface-variant transition-all group-hover:translate-x-1 group-hover:text-primary"
                />
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
