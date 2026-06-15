import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { SESSION_EXPIRED_EVENT, type SessionExpiredDetail } from '@/lib/auth'

export function SessionExpiredRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleSessionExpired(event: Event) {
      const detail = (event as CustomEvent<SessionExpiredDetail>).detail
      const routeRole = location.pathname.startsWith('/client') ? 'client' : 'coach'
      if (detail.role && detail.role !== routeRole) return

      const loginPath = routeRole === 'client' ? '/client/login' : '/coach/login'
      queryClient.clear()
      void navigate(loginPath, {
        replace: true,
        state: { reason: detail.reason },
      })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [location.pathname, navigate, queryClient])

  return null
}
