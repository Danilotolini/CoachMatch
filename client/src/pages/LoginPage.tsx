import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { fetchClientMe } from '@/api/clients'
import { isTokenExpired } from '@/lib/auth'
import { ApiError } from '@/lib/http'
import { type Role, useSessionStore } from '@/stores/sessionStore'
import { getLoginUrl } from '@/lib/cognito'
import { buildMockIdToken } from '@/dev/mockSession'
import { Button } from '@/components/ui/Button'
import type { Client } from '@/types/api'

interface LoginPageProps {
  audience: Role
}

function isLocalMockingEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_API_MOCKING === 'enabled'
}

function getSessionEndReason(raw: unknown): 'expired' | 'unauthorized' | null {
  if (typeof raw !== 'object' || raw === null) return null

  const record = raw as Record<string, unknown>
  const reason = record['reason']
  if (reason === 'expired' || reason === 'unauthorized') return reason

  const sessionExpired = record['sessionExpired']
  if (sessionExpired === 'expired' || sessionExpired === 'unauthorized') return sessionExpired

  return null
}

function isSessionEndState(raw: unknown): boolean {
  return getSessionEndReason(raw) !== null
}

function loginTargetForClient(status: Client['status']): string {
  if (status === 'ACTIVE') return '/client'
  if (status === 'ONBOARDING_HEALTH') return '/client/health'
  return '/client/onboarding'
}

export default function LoginPage({ audience }: LoginPageProps) {
  const navigate = useNavigate()
  const rawState: unknown = useLocation().state
  const [loginUrl, setLoginUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Garante que o /authorize seja iniciado uma única vez. Sem isso, o
  // double-invoke do StrictMode (dev) chama getLoginUrl duas vezes; como cada
  // chamada grava state/PKCE no sessionStorage após um await, elas podem
  // resolver fora de ordem e o redirect sair com um state que a outra chamada
  // já sobrescreveu — caindo em "Estado inválido" no callback.
  const redirectStarted = useRef(false)

  const token = useSessionStore((state) => state.sessions[audience]?.token ?? null)
  const hasSession = !!token
  const startSession = useSessionStore((state) => state.startSession)
  const endSession = useSessionStore((state) => state.endSession)
  const setActiveRole = useSessionStore((state) => state.setActiveRole)

  const fromSessionEnd = isSessionEndState(rawState)
  const expiredToken = !!token && isTokenExpired(token)

  const shouldEndCurrentSession = hasSession && (expiredToken || fromSessionEnd)
  const showMockReloginPrompt = !hasSession && fromSessionEnd && isLocalMockingEnabled()

  useEffect(() => {
    if (shouldEndCurrentSession) {
      endSession(audience)
      return
    }

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
          void navigate(loginTargetForClient(client.status), { replace: true })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return
          void navigate('/client/onboarding', { replace: true })
        })
      return () => {
        cancelled = true
      }
    }

    if (isLocalMockingEnabled()) {
      if (showMockReloginPrompt) return
      startSession(audience, buildMockIdToken(audience))
      return
    }

    if (redirectStarted.current) return
    redirectStarted.current = true

    getLoginUrl(audience)
      .then((url) => {
        setLoginUrl(url)
        window.location.href = url
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao iniciar login.')
      })
    return
  }, [
    audience,
    endSession,
    hasSession,
    navigate,
    setActiveRole,
    showMockReloginPrompt,
    shouldEndCurrentSession,
    startSession,
  ])

  if (showMockReloginPrompt) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="font-body text-sm text-error">Sessão encerrada pelo servidor.</p>
        <Button
          type="button"
          onClick={() => {
            startSession(audience, buildMockIdToken(audience))
          }}
          className="py-3"
        >
          ENTRAR NOVAMENTE
        </Button>
      </main>
    )
  }

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
