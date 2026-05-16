import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchClientMe } from '@/api/clients'
import { type Role, useSessionStore } from '@/stores/sessionStore'
import { getLoginUrl } from '@/lib/cognito'
import { buildMockIdToken } from '@/dev/mockSession'

interface LoginPageProps {
  audience: Role
}

function isLocalMockingEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_API_MOCKING === 'enabled'
}

export default function LoginPage({ audience }: LoginPageProps) {
  const navigate = useNavigate()
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasSession = useSessionStore((state) => !!state.sessions[audience]?.token)
  const startSession = useSessionStore((state) => state.startSession)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)

  useEffect(() => {
    if (hasSession) {
      setActiveRole(audience)
      if (audience === 'coach') {
        void navigate('/coach', { replace: true })
        return
      }

      let cancelled = false
      fetchClientMe()
        .then((client) => {
          if (cancelled) return
          void navigate(
            client.status === 'ACTIVE'
              ? '/client'
              : client.status === 'ONBOARDING_HEALTH'
                ? '/client/health'
                : '/client/onboarding',
            { replace: true },
          )
        })
        .catch(() => {
          if (!cancelled) void navigate('/client/onboarding', { replace: true })
        })
      return () => {
        cancelled = true
      }
    }

    if (isLocalMockingEnabled()) {
      startSession(audience, buildMockIdToken(audience))
      return
    }

    let cancelled = false
    getLoginUrl(audience)
      .then((url) => {
        if (cancelled) return
        setLoginUrl(url)
        window.location.href = url
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao iniciar login.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [audience, hasSession, navigate, setActiveRole, startSession])

  if (error) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="font-body text-sm text-error">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-background">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-on-surface-variant text-sm">Redirecionando para o login...</p>
      {loginUrl ? (
        <a href={loginUrl} className="text-primary text-sm hover:underline">
          Clique aqui se não for redirecionado
        </a>
      ) : null}
    </main>
  )
}
