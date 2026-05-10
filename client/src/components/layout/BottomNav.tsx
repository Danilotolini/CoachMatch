import { Icon } from '@/components/ui/Icon'

export type BottomNavTabId = 'browse' | 'workouts' | 'agenda' | 'profile'

interface BottomNavTab {
  id: BottomNavTabId
  icon: string
  label: string
}

const TABS: BottomNavTab[] = [
  { id: 'browse', icon: 'explore', label: 'Explorar' },
  { id: 'workouts', icon: 'fitness_center', label: 'Treinos' },
  { id: 'agenda', icon: 'calendar_today', label: 'Agenda' },
  { id: 'profile', icon: 'person', label: 'Perfil' },
]

interface BottomNavProps {
  active: BottomNavTabId
  onChange: (id: BottomNavTabId) => void
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-4 pt-3.5 rounded-t-3xl border-t border-on-surface/5 bg-surface/85 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'max(1.375rem, env(safe-area-inset-bottom))' }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onChange(tab.id)
            }}
            className={`flex flex-col items-center gap-1 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-primary/10 px-3.5 py-1.5 scale-[1.06]'
                : 'bg-transparent px-2.5 py-1.5'
            }`}
          >
            <Icon
              name={tab.icon}
              size={22}
              filled={isActive}
              className={isActive ? 'text-primary' : 'text-on-surface/40'}
            />
            <span
              className={`font-label text-[9px] font-bold uppercase tracking-[0.15em] ${
                isActive ? 'text-primary' : 'text-on-surface/40'
              }`}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
