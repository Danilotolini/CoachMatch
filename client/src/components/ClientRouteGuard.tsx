import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useClientMe } from '@/hooks/useClientMe'
import { isTokenExpired } from '@/lib/auth'
import { ApiError } from '@/lib/http'
import { useSessionStore } from '@/stores/sessionStore'
import type { ClientStatus } from '@/types/api'

const STATUS_ROUTE: Record<ClientStatus, string> = {
  ONBOARDING_PROFILE: '/client/onboarding',
  ONBOARDING_HEALTH: '/client/health',
  ACTIVE: '/client',
}

interface ClientRouteGuardProps {
  children: ReactNode
  requireOnboarded?: boolean
}

function Spinner() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </main>
  )
}

export function ClientRouteGuard({ children, requireOnboarded = false }: ClientRouteGuardProps) {
  const location = useLocation()
  const activeRole = useSessionStore((state) => state.activeRole)
  const token = useSessionStore((state) => state.sessions.client?.token ?? null)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)
  const endSession = useSessionStore((state) => state.endSession)
  const { data, isLoading, isError, error } = useClientMe()

  const expired = !!token && isTokenExpired(token)
  const isUnauthorized =
    isError && error instanceof ApiError && (error.status === 401 || error.status === 403)

  useEffect(() => {
    if (token && activeRole !== 'client') {
      setActiveRole('client')
    }
  }, [activeRole, setActiveRole, token])

  useEffect(() => {
    if (expired || isUnauthorized) {
      endSession('client')
    }
  }, [expired, isUnauthorized, endSession])

  if (!token || expired) return <Navigate to="/client/login" replace />

  if (activeRole !== 'client') return <Spinner />

  if (isLoading) return <Spinner />

  if (isError) {
    if (isUnauthorized) return <Navigate to="/client/login" replace />
    if (requireOnboarded) return <Navigate to="/client/onboarding" replace />
    return <>{children}</>
  }

  if (data) {
    const expectedPath = STATUS_ROUTE[data.status]
    if (requireOnboarded && data.status !== 'ACTIVE') {
      return <Navigate to={expectedPath} replace />
    }
    if (!requireOnboarded && location.pathname !== expectedPath) {
      return <Navigate to={expectedPath} replace />
    }
  }

  return <>{children}</>
}
