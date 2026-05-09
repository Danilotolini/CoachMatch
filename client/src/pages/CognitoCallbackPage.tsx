import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { exchangeCodeForTokens } from '@/lib/cognito'
import { setToken } from '@/lib/auth'
import { fetchCoachMe } from '@/api/coaches'
import { ApiError } from '@/lib/http'
import type { CoachStatus } from '@/types/api'

function statusRoute(status: CoachStatus): string {
  switch (status) {
    case 'PENDING_PROFILE':
      return '/cadastro/profissional'
    case 'PROFILE_REVIEW':
      return '/em-analise'
    case 'APPROVED':
    case 'ACTIVE':
      return '/dashboard'
    case 'REJECTED':
    case 'INACTIVE':
      return '/reprovado'
  }
}

export default function CognitoCallbackPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  // Prevents double-invocation in React StrictMode (dev only)
  const handled = useRef(false)

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const errorParam = params.get('error')
  const errorDesc = params.get('error_description')
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
        const tokens = await exchangeCodeForTokens(authorizationCode, state)
        setToken(tokens.id_token)

        // Remove code from URL before routing
        window.history.replaceState({}, '', window.location.pathname)

        try {
          const coach = await fetchCoachMe()
          queryClient.setQueryData(['coachMe'], coach)
          void navigate(statusRoute(coach.status), { replace: true })
        } catch (err) {
          const is404 = err instanceof ApiError && err.status === 404
          const isNetwork = err instanceof TypeError
          if (is404 || isNetwork) {
            void navigate('/cadastro/profissional', { replace: true })
          } else {
            throw err
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro na autenticação.')
      }
    }

    void finish(code)
  }, [code, navigate, queryClient, state, urlError])

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
          <a href="/entrar" className="text-primary font-bold hover:underline">
            Tentar novamente
          </a>
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
