import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useCoachMe } from '@/hooks/useCoachMe'
import { getToken } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'
import { ApiError } from '@/lib/http'
import type { CoachStatus } from '@/types/api'

const STATUS_ROUTE: Record<CoachStatus, string> = {
  PENDING_PROFILE: '/coach/onboarding',
  PROFILE_REVIEW: '/coach/pending-review',
  APPROVED: '/coach',
  ACTIVE: '/coach',
  REJECTED: '/coach/rejected',
  INACTIVE: '/coach/rejected',
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

export function RouteGuard({ allow, children }: RouteGuardProps) {
  const hasToken = !!getToken()
  const { data, isLoading, isError, error } = useCoachMe()

  if (!hasToken) return <Navigate to="/coach/login" replace />

  if (isLoading) return <Spinner />

  if (isError) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      useSessionStore.getState().endSession('coach')
      return <Navigate to="/coach/login" replace />
    }
    // 404 ou falha de rede (CORS, offline): assume perfil ainda não criado
    if (!allow.includes('PENDING_PROFILE')) {
      return <Navigate to="/coach/onboarding" replace />
    }
    return <>{children}</>
  }

  if (data && !allow.includes(data.status)) {
    return <Navigate to={STATUS_ROUTE[data.status]} replace />
  }

  return <>{children}</>
}
