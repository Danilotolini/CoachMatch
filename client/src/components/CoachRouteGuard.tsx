import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useCoachMe } from '@/hooks/useCoachMe'
import { isTokenExpired } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'
import { ApiError } from '@/lib/http'
import { coachStatusRoute, isCoachOnboardingStatus } from '@/lib/coachStatus'
import type { CoachStatus } from '@/types/api'

interface RouteGuardProps {
  allow: CoachStatus[]
  children: ReactNode
}

function Spinner() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  )
}

export function CoachRouteGuard({ allow, children }: RouteGuardProps) {
  const activeRole = useSessionStore((state) => state.activeRole)
  const token = useSessionStore((state) => state.sessions.coach?.token ?? null)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)
  const endSession = useSessionStore((state) => state.endSession)
  const { data, isLoading, isError, error } = useCoachMe()

  const expired = !!token && isTokenExpired(token)
  const isUnauthorized =
    isError && error instanceof ApiError && (error.status === 401 || error.status === 403)

  useEffect(() => {
    if (token && activeRole !== 'coach') {
      setActiveRole('coach')
    }
  }, [activeRole, setActiveRole, token])

  useEffect(() => {
    if (expired || isUnauthorized) {
      endSession('coach')
    }
  }, [expired, isUnauthorized, endSession])

  if (!token || expired) {
    return (
      <Navigate
        to="/coach/login"
        replace
        state={
          expired ? { reason: 'expired' } : isUnauthorized ? { reason: 'unauthorized' } : undefined
        }
      />
    )
  }

  if (activeRole !== 'coach') return <Spinner />

  if (isLoading) return <Spinner />

  if (isError) {
    if (isUnauthorized)
      return <Navigate to="/coach/login" replace state={{ reason: 'unauthorized' }} />
    // 404 ou falha de rede (CORS, offline): assume perfil ainda não criado
    if (!allow.some(isCoachOnboardingStatus)) {
      return <Navigate to="/coach/onboarding" replace />
    }
    return <>{children}</>
  }

  if (data && !allow.includes(data.status)) {
    return <Navigate to={coachStatusRoute(data.status)} replace />
  }

  return <>{children}</>
}
