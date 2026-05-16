import { useEffect, useState } from 'react'
import { type Role, useSessionStore } from '@/stores/sessionStore'
import { getLoginUrl } from '@/lib/cognito'

interface LoginPageProps {
  audience: Role
}

export default function LoginPage({ audience }: LoginPageProps) {
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasSession = useSessionStore((state) => !!state.sessions[audience]?.token)
  const clientOnboarded = useSessionStore((state) => state.sessions.client?.onboarded ?? false)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)

  useEffect(() => {
    if (hasSession) {
      setActiveRole(audience)
      const target =
        audience === 'client' ? (clientOnboarded ? '/client' : '/client/onboarding') : '/coach'
      window.location.replace(target)
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
  }, [audience, hasSession, clientOnboarded, setActiveRole])

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
