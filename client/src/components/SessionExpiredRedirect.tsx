import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { SESSION_EXPIRED_EVENT, type SessionExpiredDetail } from '@/lib/auth'

function loginPathForCurrentRoute(): string {
  const path = window.location.pathname
  if (path.startsWith('/client')) return '/client/login'
  return '/coach/login'
}

export function SessionExpiredRedirect() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    function handleSessionExpired(event: Event) {
      const detail = (event as CustomEvent<SessionExpiredDetail>).detail
      queryClient.clear()
      void navigate(loginPathForCurrentRoute(), {
        replace: true,
        state: { sessionExpired: detail.reason },
      })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [navigate, queryClient])

  return null
}
