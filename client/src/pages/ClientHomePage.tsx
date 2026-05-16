import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { getAuthUser } from '@/lib/auth'
import { logout } from '@/lib/cognito'

interface Coach {
  id: number
  name: string
  specialty: string
  rating: string
  price: string
  location: string
  availability: string
  tone: string
  image: string | null
}

interface RecentCoach {
  id: number
  name: string
  note: string
  icon: string
}

const COACHES: Coach[] = [
  {
    id: 1,
    name: 'Marcos Vieira',
    specialty: 'Musculacao',
    rating: '4.9',
    price: 'R$ 180',
    location: 'Pinheiros',
    availability: 'Hoje as 18h',
    tone: 'from-primary/40 via-surface-container-high to-surface-container-low',
    image: '/assets/images/onboarding-hero-mobile.png',
  },
  {
    id: 2,
    name: 'Julia Ramos',
    specialty: 'Funcional',
    rating: '4.8',
    price: 'R$ 150',
    location: 'Vila Madalena',
    availability: 'Amanha cedo',
    tone: 'from-tertiary/35 via-surface-container-high to-surface-container-low',
    image: null,
  },
  {
    id: 3,
    name: 'Rafael Souza',
    specialty: 'Crossfit',
    rating: '5.0',
    price: 'R$ 210',
    location: 'Itaim Bibi',
    availability: 'Sabado as 10h',
    tone: 'from-secondary/30 via-surface-container-high to-surface-container-low',
    image: null,
  },
]

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

const CLIENT_NAV_ITEMS = [
  { label: 'Inicio', icon: 'home', active: true },
  { label: 'Buscar', icon: 'search' },
  { label: 'Agenda', icon: 'event' },
  { label: 'Favoritos', icon: 'favorite' },
  { label: 'Perfil', icon: 'person' },
]

export default function ClientHomePage() {
  const user = getAuthUser()
  const firstName = useMemo(() => user.name?.split(' ')[0] ?? 'aluno', [user.name])

  function handleLogout() {
    logout('client', '/')
  }

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <ClientTopBar firstName={firstName} onLogout={handleLogout} />

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

function ClientTopBar({ firstName, onLogout }: { firstName: string; onLogout: () => void }) {
  return (
    <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 md:px-10 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
      <div className="flex min-w-0 flex-col">
        <span className="font-label text-xs text-on-surface-variant">Hoje no CoachMatch</span>
        <h1 className="truncate font-headline text-2xl font-bold tracking-tight lg:text-3xl">
          Oi, {firstName}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high"
          aria-label="Notificacoes"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="font-label text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface lg:hidden"
        >
          Sair
        </button>
      </div>
    </header>
  )
}

function SearchPanel() {
  return (
    <section className="flex flex-col gap-3 pt-2 lg:pt-0">
      <button
        type="button"
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
        <FilterPill icon="pin_drop" label="Pinheiros" />
        <FilterPill icon="fitness_center" label="Musculacao" />
      </div>
    </section>
  )
}

function FilterPill({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
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
      <SectionHeader title="Próxima sessão" action="Chat" icon="chat" />
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
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title="Recomendados pra voce" action="Ver todos" icon="arrow_forward" />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {COACHES.map((coach) => (
          <CoachCard key={coach.id} coach={coach} />
        ))}
      </div>
    </section>
  )
}

function CoachCard({ coach }: { coach: Coach }) {
  return (
    <button
      type="button"
      className="group w-[76vw] max-w-70 shrink-0 snap-start overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low text-left transition-all hover:border-primary/35 hover:bg-surface-container md:w-62.5 lg:w-auto lg:max-w-none"
    >
      <div className={`relative h-40 overflow-hidden bg-linear-to-br ${coach.tone}`}>
        {coach.image ? (
          <img src={coach.image} alt="" className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-outlined text-[64px] text-primary/70">exercise</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/80 to-transparent" />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 font-label text-xs font-semibold text-on-surface backdrop-blur">
          <span className="material-symbols-outlined text-[15px] text-tertiary">star</span>
          {coach.rating}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-headline text-lg font-semibold tracking-tight">{coach.name}</h3>
          <p className="font-label text-xs font-bold text-on-surface-variant uppercase">
            {coach.specialty} · {coach.location}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="font-headline text-lg font-bold text-primary">{coach.price}</span>
            <span className="font-label text-xs text-on-surface-variant"> / sessao</span>
          </div>
          <span className="font-label text-xs text-on-surface-variant">{coach.availability}</span>
        </div>
      </div>
    </button>
  )
}

function ContinueExploring() {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title="Continuar explorando" action="Favoritos" icon="favorite" />
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

function SectionHeader({ title, action, icon }: { title: string; action?: string; icon?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-headline text-xl font-semibold tracking-tight">{title}</h2>
      {action ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 font-label text-sm font-medium text-primary transition-colors hover:underline"
        >
          {action}
          {icon ? <span className="material-symbols-outlined text-[16px]">{icon}</span> : null}
        </button>
      ) : null}
    </div>
  )
}

function ClientSideNav({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/40 px-5 py-8 lg:flex">
      <div className="mb-10 px-2 font-headline text-xl font-black tracking-tight text-primary uppercase">
        CoachMatch
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {CLIENT_NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                item.active
                  ? 'bg-surface-container-high text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label text-sm font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        <span className="font-label text-sm font-medium">Sair</span>
      </button>
    </aside>
  )
}

function ClientBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant/10 bg-surface-container-low/95 backdrop-blur lg:hidden">
      <ul
        className="grid grid-cols-5 px-1 pt-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {CLIENT_NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors ${
                item.active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="max-w-full truncate font-label text-[10px] font-medium">
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
