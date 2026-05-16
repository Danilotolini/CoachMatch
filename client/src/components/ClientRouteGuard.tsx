import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { isTokenExpired } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'

interface ClientRouteGuardProps {
  children: ReactNode
}

function Spinner() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </main>
  )
}

export function ClientRouteGuard({ children }: ClientRouteGuardProps) {
  const activeRole = useSessionStore((state) => state.activeRole)
  const token = useSessionStore((state) => state.sessions.client?.token ?? null)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)
  const endSession = useSessionStore((state) => state.endSession)

  useEffect(() => {
    if (token && activeRole !== 'client') {
      setActiveRole('client')
    }
  }, [activeRole, setActiveRole, token])

  if (!token) return <Navigate to="/client/login" replace />

  if (isTokenExpired(token)) {
    endSession('client')
    return <Navigate to="/client/login" replace />
  }

  if (activeRole !== 'client') return <Spinner />

  return <>{children}</>
}
