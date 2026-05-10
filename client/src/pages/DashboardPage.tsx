import { useCoachMe } from '@/hooks/useCoachMe'
import { logout } from '@/lib/cognito'

/**
 * Layout breakpoints:
 * - Mobile (<lg): single-column feed, glass top header, fixed bottom nav.
 * - Desktop (lg+): 3-col shell — sticky 240px side rail (logo + nav + logout),
 *   main feed (max-w-3xl), sticky 320px aside (approved banner + profile card).
 */
export default function DashboardPage() {
  const { data } = useCoachMe()

  const profile = data?.profile
  const name = profile?.name ?? undefined
  const cref = profile?.cref ?? undefined
  const profilePhoto: string | undefined = undefined
  const firstName = name?.split(' ')[0] ?? 'profissional'
  const specialtiesCount = profile?.specialties.length ?? 0
  const homeService = data?.work_location.find((loc) => loc.type === 'HOME_SERVICE')
  const gymsCount = data?.work_location.filter((loc) => loc.type === 'GYM').length ?? 0
  const territoryLabel = homeService ? 'Bairros atendidos' : 'Academias'
  const territoryValue = homeService
    ? String(homeService.coverage.neighborhoods.length)
    : String(gymsCount)

  function handleLogout() {
    logout()
  }

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <SideNav onLogout={handleLogout} />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:flex-row lg:pb-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            firstName={firstName}
            profilePhoto={profilePhoto}
            name={name}
            onLogout={handleLogout}
          />

          <section className="flex flex-col gap-8 px-6 pb-12 md:px-12 lg:mx-auto lg:w-full lg:max-w-3xl lg:px-10">
            <ApprovedBanner className="lg:hidden" />

            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <StatCard icon="visibility" label="Visualizações" value="128" trend="+12%" />
              <StatCard icon="forum" label="Contatos" value="9" trend="+3" />
              <StatCard icon="event_available" label="Sessões" value="4" trend="esta semana" />
            </div>

            <Section
              title="Próximas sessões"
              action={{ label: 'Ver agenda', icon: 'arrow_forward' }}
            >
              <div className="flex flex-col gap-3">
                <SessionCard
                  clientName="Marina Silva"
                  when="Hoje · 18h00"
                  location="Smart Fit Paulista"
                  kind="Musculação"
                />
                <SessionCard
                  clientName="Pedro Lima"
                  when="Amanhã · 07h30"
                  location="Atendimento domiciliar"
                  kind="Funcional"
                />
              </div>
            </Section>

            <Section
              title="Novas solicitações"
              action={{ label: 'Ver tudo', icon: 'arrow_forward' }}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <RequestCard
                  name="Ana Costa"
                  message="Procuro treinos de hipertrofia 3x na semana."
                />
                <RequestCard
                  name="Rafael Souza"
                  message="Acabei de me mudar pra Pinheiros, busco personal."
                />
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

      <BottomNav />
    </main>
  )
}

interface TopBarProps {
  firstName: string
  profilePhoto: string | undefined
  name: string | undefined
  onLogout: () => void
}

function TopBar({ firstName, profilePhoto, name, onLogout }: TopBarProps) {
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high lg:bg-surface-container"
          aria-label="Notificações"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="font-label text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface lg:hidden"
        >
          SAIR
        </button>
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
          Você está visível para alunos buscando personal trainers.
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
  action?: { label: string; icon: string }
  children: React.ReactNode
  className?: string
}

function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-xl font-semibold tracking-tight">{title}</h2>
        {action ? (
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
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-primary py-2 font-headline text-sm font-bold tracking-wide text-on-primary-fixed uppercase transition-all hover:brightness-105 active:scale-[0.98]"
        >
          RESPONDER
        </button>
        <button
          type="button"
          className="rounded-lg border border-outline-variant/30 px-4 font-label text-sm font-medium text-on-surface-variant transition-colors hover:border-outline"
        >
          DEPOIS
        </button>
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
      <button
        type="button"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-high py-3 font-headline text-sm font-bold tracking-wide text-on-surface uppercase transition-all hover:bg-surface-container-highest active:scale-[0.99]"
      >
        VER PERFIL PÚBLICO
        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
      </button>
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

const NAV_ITEMS: { label: string; icon: string; active?: boolean }[] = [
  { label: 'Início', icon: 'home', active: true },
  { label: 'Agenda', icon: 'event' },
  { label: 'Alunos', icon: 'group' },
  { label: 'Perfil', icon: 'person' },
]

function SideNav({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/40 px-5 py-8 lg:flex">
      <div className="mb-10 px-2 font-headline text-xl font-black tracking-tighter text-primary uppercase">
        COACHMATCH
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
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
        <span className="font-label text-sm font-medium">SAIR</span>
      </button>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-outline-variant/10 bg-surface-container-low/95 backdrop-blur lg:hidden">
      <ul
        className="flex items-stretch justify-around px-2 pt-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                item.active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="font-label text-[11px] font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
