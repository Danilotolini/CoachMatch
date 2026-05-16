import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { exchangeCodeForTokens } from '@/lib/cognito'
import { type Role, useSessionStore } from '@/stores/sessionStore'
import { fetchClientMe } from '@/api/clients'
import { fetchCoachMe } from '@/api/coaches'
import { ApiError } from '@/lib/http'
import type { ClientStatus, CoachStatus } from '@/types/api'

function statusRoute(status: CoachStatus): string {
  switch (status) {
    case 'ONBOARDING_PROFILE':
      return '/coach/onboarding'
    case 'PENDING_REVIEW':
      return '/coach/pending-review'
    case 'APPROVED':
      return '/coach'
    case 'REJECTED':
      return '/coach/rejected'
  }
}

function clientStatusRoute(status: ClientStatus): string {
  switch (status) {
    case 'ONBOARDING_PROFILE':
      return '/client/onboarding'
    case 'ONBOARDING_HEALTH':
      return '/client/health'
    case 'ACTIVE':
      return '/client'
  }
}

interface CognitoCallbackPageProps {
  audience: Role
}

export default function CognitoCallbackPage({ audience }: CognitoCallbackPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  // Prevents double-invocation in React StrictMode (dev only)
  const handled = useRef(false)

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const urlError = errorParam
    ? (errorDesc ?? errorParam)
    : !code
      ? 'Código de autorização não encontrado.'
      : null

  useEffect(() => {
    if (handled.current || !code || urlError) return
    handled.current = true

    async function finish(authorizationCode: string) {
      try {
        const tokens = await exchangeCodeForTokens(authorizationCode, state, audience)
        const store = useSessionStore.getState()
        store.startSession(audience, tokens.id_token)

        // Remove code from URL before routing
        window.history.replaceState({}, '', window.location.pathname)

        if (audience === 'client') {
          try {
            const client = await fetchClientMe()
            queryClient.setQueryData(['clientMe'], client)
            void navigate(clientStatusRoute(client.status), { replace: true })
          } catch (err) {
            const is404 = err instanceof ApiError && err.status === 404
            const isNetwork = err instanceof TypeError
            if (is404 || isNetwork) {
              void navigate('/client/onboarding', { replace: true })
            } else {
              throw err
            }
          }
          return
        }

        try {
          const coach = await fetchCoachMe()
          queryClient.setQueryData(['coachMe'], coach)
          void navigate(statusRoute(coach.status), { replace: true })
        } catch (err) {
          const is404 = err instanceof ApiError && err.status === 404
          const isNetwork = err instanceof TypeError
          if (is404 || isNetwork) {
            void navigate('/coach/onboarding', { replace: true })
          } else {
            throw err
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro na autenticação.')
      }
    }

    void finish(code)
  }, [audience, code, navigate, queryClient, state, urlError])

  const displayedError = error ?? urlError

  if (displayedError) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
        <div className="text-center max-w-sm">
          <span className="material-symbols-outlined text-error text-5xl mb-4 block">error</span>
          <h1 className="font-headline text-xl font-bold text-on-surface mb-2">
            Erro na autenticação
          </h1>
          <p className="text-on-surface-variant text-sm mb-6">{displayedError}</p>
          <Link
            to={audience === 'client' ? '/client/login' : '/coach/login'}
            className="text-primary font-bold hover:underline"
          >
            Tentar novamente
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-on-surface-variant text-sm">Autenticando...</p>
      </div>
    </main>
  )
}
