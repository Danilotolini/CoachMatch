import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useCoachMe } from '@/hooks/useCoachMe'
import { useSessionStore } from '@/stores/sessionStore'
import { ApiError } from '@/lib/http'
import type { CoachStatus } from '@/types/api'

const STATUS_ROUTE: Record<CoachStatus, string> = {
  PENDING_PROFILE: '/coach/onboarding',
  ONBOARDING_PROFILE: '/coach/onboarding',
  PENDING_REVIEW: '/coach/pending-review',
  APPROVED: '/coach',
  REJECTED: '/coach/rejected',
}

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
  const token = useSessionStore((state) => state.sessions.coach?.token ?? null)
  const endSession = useSessionStore((state) => state.endSession)
  const { data, isLoading, isError, error } = useCoachMe()

  const isUnauthorized =
    isError && error instanceof ApiError && (error.status === 401 || error.status === 403)

  useEffect(() => {
    if (isUnauthorized) {
      endSession('coach')
    }
  }, [isUnauthorized, endSession])

  if (!token) return <Navigate to="/coach/login" replace />

  if (isLoading) return <Spinner />

  if (isError) {
    if (isUnauthorized) return <Navigate to="/coach/login" replace />
    // 404 ou falha de rede (CORS, offline): assume perfil ainda não criado
    if (!allow.includes('ONBOARDING_PROFILE')) {
      return <Navigate to="/coach/onboarding" replace />
    }
    return <>{children}</>
  }

  if (data && !allow.includes(data.status)) {
    return <Navigate to={STATUS_ROUTE[data.status]} replace />
  }

  return <>{children}</>
}
