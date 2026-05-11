import { Outlet } from 'react-router'
import { SessionExpiredRedirect } from '@/components/SessionExpiredRedirect'

export function AppShell() {
  return (
    <>
      <SessionExpiredRedirect />
      <Outlet />
    </>
  )
}
