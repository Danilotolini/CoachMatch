import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useCoachMe } from '@/hooks/useCoachMe'
import { getToken, clearToken } from '@/lib/auth'
import { ApiError } from '@/lib/http'
import type { CoachStatus } from '@/types/api'

const STATUS_ROUTE: Record<CoachStatus, string> = {
  PROFILE_INCOMPLETE: '/cadastro/profissional',
  PENDING_REVIEW: '/em-analise',
  APPROVED: '/dashboard',
  REJECTED: '/reprovado',
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

  if (!hasToken) return <Navigate to="/entrar" replace />

  if (isLoading) return <Spinner />

  if (isError) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      clearToken()
      return <Navigate to="/entrar" replace />
    }
    // 404 ou falha de rede (CORS, offline): assume perfil ainda não criado
    if (!allow.includes('PROFILE_INCOMPLETE')) {
      return <Navigate to="/cadastro/profissional" replace />
    }
    return <>{children}</>
  }

  if (data && !allow.includes(data.status)) {
    return <Navigate to={STATUS_ROUTE[data.status]} replace />
  }

  return <>{children}</>
}
