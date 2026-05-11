import { useEffect, useState } from 'react'
import { type AppAudience, toCognitoAudience } from '@/lib/audience'
import { getLoginUrl } from '@/lib/cognito'

interface LoginPageProps {
  audience?: AppAudience
}

export default function LoginPage({ audience = 'coach' }: LoginPageProps) {
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLoginUrl(toCognitoAudience(audience))
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
  }, [audience])

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
