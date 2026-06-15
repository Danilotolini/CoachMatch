import { useLocation, useNavigate } from 'react-router'
import { logout } from '@/lib/cognito'
import { Icon } from '@/components/ui/Icon'

type CoachNavId = 'home' | 'schedule' | 'profile'

interface CoachNavItem {
  id: CoachNavId
  label: string
  icon: string
  path: string
}

const COACH_NAV_ITEMS: CoachNavItem[] = [
  { id: 'home', label: 'Início', icon: 'home', path: '/coach' },
  { id: 'schedule', label: 'Agenda', icon: 'event', path: '/coach/schedule' },
  { id: 'profile', label: 'Perfil', icon: 'person', path: '/coach/profile' },
]

function getActiveId(pathname: string): CoachNavId {
  if (pathname.startsWith('/coach/profile')) return 'profile'
  if (pathname.startsWith('/coach/schedule')) return 'schedule'
  return 'home'
}

export function CoachSideNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = getActiveId(location.pathname)

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-outline-variant/10 bg-surface-container-low/40 px-5 py-8 lg:flex">
      <div className="mb-10 px-2 font-headline text-xl font-black tracking-tighter text-primary uppercase">
        COACHMATCH
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {COACH_NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  void navigate(item.path)
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-surface-container-high text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon name={item.icon} size={20} />
                <span className="font-label text-sm font-medium">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => {
          logout('coach')
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon name="logout" size={20} />
        <span className="font-label text-sm font-medium">Sair</span>
      </button>
    </aside>
  )
}

export function CoachBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = getActiveId(location.pathname)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-outline-variant/10 bg-surface-container-low/95 backdrop-blur lg:hidden">
      <ul
        className="grid grid-cols-3 px-2 pt-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {COACH_NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  void navigate(item.path)
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                  isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name={item.icon} size={22} filled={isActive} />
                <span className="font-label text-[10px] font-medium">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
