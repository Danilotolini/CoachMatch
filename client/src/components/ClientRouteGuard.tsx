import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useClientMe } from '@/hooks/useClientMe'
import { isTokenExpired } from '@/lib/auth'
import { ApiError } from '@/lib/http'
import { useSessionStore } from '@/stores/sessionStore'
import type { ClientStatus } from '@/types/api'

const STATUS_ROUTE: Record<ClientStatus, string> = {
  PENDING_PROFILE: '/client/onboarding',
  ONBOARDING_HEALTH: '/client/health',
  ACTIVE: '/client',
}

function routeForStatus(status: unknown): string {
  if (typeof status === 'string' && status in STATUS_ROUTE) {
    return STATUS_ROUTE[status as ClientStatus]
  }
  return STATUS_ROUTE.PENDING_PROFILE
}

function buildLoginState(expired: boolean, isUnauthorized: boolean): { reason: string } | undefined {
  if (expired) return { reason: 'expired' }
  if (isUnauthorized) return { reason: 'unauthorized' }
  return undefined
}

function getExpectedPath(
  data: { status: ClientStatus },
  requireOnboarded: boolean,
  pathname: string,
): string | null {
  const expectedPath = routeForStatus(data.status)
  if (requireOnboarded && data.status !== 'ACTIVE') return expectedPath
  if (!requireOnboarded && pathname !== expectedPath) return expectedPath
  return null
}

interface ClientRouteGuardProps {
  readonly children: ReactNode
  readonly requireOnboarded?: boolean
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

  if (!token || expired) {
    return <Navigate to="/client/login" replace state={buildLoginState(expired, isUnauthorized)} />
  }

  if (activeRole !== 'client') return <Spinner />

  if (isLoading) return <Spinner />

  if (isError && isUnauthorized)
    return <Navigate to="/client/login" replace state={{ reason: 'unauthorized' }} />
  if (isError && requireOnboarded) return <Navigate to="/client/onboarding" replace />
  if (isError) return <>{children}</>

  if (data) {
    const redirectTo = getExpectedPath(data, requireOnboarded, location.pathname)
    if (redirectTo) return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
