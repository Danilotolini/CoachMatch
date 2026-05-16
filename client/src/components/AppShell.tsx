import { Link, Outlet, useLocation } from 'react-router'
import { SessionExpiredRedirect } from '@/components/SessionExpiredRedirect'
import { Icon } from '@/components/ui/Icon'

function DevToolsFab() {
  const location = useLocation()
  if (!import.meta.env.DEV || location.pathname === '/dev') return null

  return (
    <Link
      to="/dev"
      aria-label="Abrir painel dev"
      title="Painel dev"
      className="fixed right-3 bottom-18 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary-fixed shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:brightness-105 active:scale-95"
    >
      <Icon name="terminal" size={22} />
    </Link>
  )
}

export function AppShell() {
  return (
    <>
      <SessionExpiredRedirect />
      <Outlet />
      <DevToolsFab />
    </>
  )
}
