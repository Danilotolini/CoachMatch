import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CoachCard as SharedCoachCard } from '@/components/coach/CoachCard'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import { Card } from '@/components/ui/Card'
import { useCoachSearch } from '@/hooks/useCoachSearch'
import { getAuthUser } from '@/lib/auth'

interface RecentCoach {
  id: number
  name: string
  note: string
  icon: string
}

const RECENT_COACHES: RecentCoach[] = [
  {
    id: 1,
    name: 'Bia Martins',
    note: 'Hipertrofia e reabilitacao em Perdizes',
    icon: 'favorite',
  },
  {
    id: 2,
    name: 'Caio Lima',
    note: 'Corrida de rua com treino no parque',
    icon: 'history',
  },
]

export default function ClientHomePage() {
  const user = getAuthUser()
  const firstName = useMemo(() => user.name?.split(' ')[0] ?? 'aluno', [user.name])

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <ClientTopBar firstName={firstName} />

        <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
          <section className="flex min-w-0 flex-1 flex-col gap-8 px-4 pb-12 sm:px-6 md:px-10 lg:mx-auto lg:max-w-4xl lg:px-10">
            <SearchPanel />
            <NextSessionCard />
            <CoachRail />
            <ContinueExploring />
          </section>

          <aside className="hidden border-l border-outline-variant/10 bg-surface-container-low/30 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-80 lg:shrink-0 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:px-6 lg:py-8 xl:w-96">
            <ClientSummary />
            <MapPreview />
            <AgendaPreview />
          </aside>
        </div>
      </div>

      <ClientBottomNav />
    </main>
  )
}

function ClientTopBar({ firstName }: { firstName: string }) {
  return (
    <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 md:px-10 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
      <div className="flex min-w-0 flex-col">
        <span className="font-label text-xs text-on-surface-variant">Hoje no CoachMatch</span>
        <h1 className="truncate font-headline text-2xl font-bold tracking-tight lg:text-3xl">
          Oi, {firstName}
        </h1>
      </div>
    </header>
  )
}

function SearchPanel() {
  const navigate = useNavigate()

  return (
    <section className="flex flex-col gap-3 pt-2 lg:pt-0">
      <button
        type="button"
        onClick={() => {
          void navigate('/client/search')
        }}
        className="flex w-full items-center gap-3 rounded-full border border-outline-variant/20 bg-surface-container-highest px-4 py-3 text-left transition-colors hover:border-primary/40"
      >
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
          search
        </span>
        <span className="min-w-0 flex-1 truncate font-body text-sm text-on-surface-variant">
          Buscar personal, modalidade ou local
        </span>
        <span className="material-symbols-outlined text-[20px] text-primary">tune</span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <FilterPill icon="pin_drop" label="Pinheiros" to="/client/search?n=Pinheiros" />
        <FilterPill
          icon="fitness_center"
          label="Musculação"
          to="/client/search?specialties=Muscula%C3%A7%C3%A3o"
        />
      </div>
    </section>
  )
}

function FilterPill({ icon, label, to }: { icon: string; label: string; to: string }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => {
        void navigate(to)
      }}
      className="flex min-w-0 items-center justify-center gap-1 rounded-lg bg-surface-container-low px-2 py-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span className="truncate font-label text-[11px] font-medium">{label}</span>
    </button>
  )
}

function NextSessionCard() {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title="Próxima sessão" />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary-fixed">
            <span className="material-symbols-outlined text-[32px]">event_available</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="font-headline text-lg font-semibold">Hoje, 18h00</h2>
              <span className="rounded-full border border-primary/30 px-2 py-0.5 font-label text-[11px] font-medium text-primary">
                confirmado
              </span>
            </div>
            <p className="font-body text-sm text-on-surface-variant">
              Treino de musculacao com Marcos Vieira na Smart Fit Paulista.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container-high px-4 py-3 font-headline text-sm font-bold text-on-surface uppercase transition-all hover:bg-surface-container-highest active:scale-[0.98]"
          >
            WhatsApp
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        </div>
      </Card>
    </section>
  )
}

function CoachRail() {
  const navigate = useNavigate()
  const { data, isLoading } = useCoachSearch({ limit: 3, sort: 'rating' })
  const coaches = data?.data ?? []

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        title="Recomendados pra você"
        action="Ver todos"
        icon="arrow_forward"
        onAction={() => {
          void navigate('/client/search?sort=rating')
        }}
      />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-72 w-[76vw] max-w-70 shrink-0 animate-pulse rounded-xl bg-surface-container-low md:w-62.5 lg:w-auto lg:max-w-none"
              />
            ))
          : coaches.map((coach) => (
              <div
                key={coach.coachId}
                className="w-[76vw] max-w-70 shrink-0 snap-start md:w-62.5 lg:w-auto lg:max-w-none"
              >
                <SharedCoachCard
                  name={coach.name}
                  specialties={coach.specialties.join(' · ')}
                  rating={coach.rating.toFixed(1)}
                  price={coach.priceFrom}
                  {...(coach.photo ? { image: coach.photo } : {})}
                  location={`${coach.neighborhood}, ${coach.city}`}
                  availability={coach.nextAvailability}
                  onClick={() => {
                    void navigate(`/client/coaches/${coach.coachId}`)
                  }}
                />
              </div>
            ))}
      </div>
    </section>
  )
}

function ContinueExploring() {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title="Continuar explorando" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {RECENT_COACHES.map((coach) => (
          <Card key={coach.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <span className="material-symbols-outlined text-[21px]">{coach.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-headline text-base font-semibold">{coach.name}</h3>
                <p className="truncate font-body text-sm text-on-surface-variant">{coach.note}</p>
              </div>
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                chevron_right
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ClientSummary() {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div>
          <h2 className="font-headline text-base font-semibold">Perfil pronto</h2>
          <p className="font-label text-sm text-on-surface-variant">Ready to match</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SummaryMetric label="Objetivo" value="Hipertrofia" />
        <SummaryMetric label="Raio" value="10 km" />
      </div>
    </Card>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container px-3 py-3">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <p className="mt-1 font-headline text-sm font-semibold">{value}</p>
    </div>
  )
}

function MapPreview() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="relative h-44 bg-surface-container">
        <div className="kinetic-grid absolute inset-0" />
        <div className="absolute top-8 left-10 h-3 w-3 rounded-full bg-primary shadow-[0_0_0_10px_rgba(244,255,198,0.08)]" />
        <div className="absolute right-12 bottom-12 h-3 w-3 rounded-full bg-tertiary shadow-[0_0_0_10px_rgba(255,235,156,0.08)]" />
        <div className="absolute top-16 right-20 h-3 w-3 rounded-full bg-secondary shadow-[0_0_0_10px_rgba(239,231,84,0.08)]" />
        <div className="absolute inset-x-4 bottom-4 rounded-lg bg-black/55 px-3 py-2 backdrop-blur">
          <p className="font-label text-xs text-on-surface-variant">
            68 treinadores perto de Pinheiros
          </p>
        </div>
      </div>
    </Card>
  )
}

function AgendaPreview() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-headline text-sm font-semibold text-on-surface-variant uppercase">
        Sua semana
      </h2>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">calendar_month</span>
          <div>
            <p className="font-headline text-sm font-semibold">2 treinos agendados</p>
            <p className="font-label text-xs text-on-surface-variant">Proximo treino hoje</p>
          </div>
        </div>
      </Card>
    </section>
  )
}

function SectionHeader({
  title,
  action,
  icon,
  onAction,
}: {
  title: string
  action?: string
  icon?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-headline text-xl font-semibold tracking-tight">{title}</h2>
      {action && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1 font-label text-sm font-medium text-primary transition-colors hover:underline"
        >
          {action}
          {icon ? <span className="material-symbols-outlined text-[16px]">{icon}</span> : null}
        </button>
      ) : null}
    </div>
  )
}
