import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPersistedSession,
  getActiveRole,
  getActiveToken,
  getSessionToken,
  SESSION_STORAGE_KEY,
  type Role,
  useSessionStore,
} from './sessionStore'

interface PersistedState {
  activeRole: Role | null
  sessions: Record<string, { token: string }>
}

function readPersisted(): PersistedState | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
  return raw ? ((JSON.parse(raw) as { state: PersistedState }).state ?? null) : null
}

beforeEach(() => {
  useSessionStore.setState({ activeRole: null, sessions: {} })
  sessionStorage.clear()
})

describe('sessionStore', () => {
  it('inicia sessões separadas por papel e ativa a sessão mais recente', () => {
    useSessionStore.getState().startSession('coach', 'coach-token')
    useSessionStore.getState().startSession('client', 'client-token')

    expect(getActiveRole()).toBe('client')
    expect(getActiveToken()).toBe('client-token')
    expect(getSessionToken('coach')).toBe('coach-token')
    expect(getSessionToken('client')).toBe('client-token')
  })

  it('troca papel ativo apenas quando existe sessão para o papel', () => {
    useSessionStore.getState().startSession('coach', 'coach-token')

    useSessionStore.getState().setActiveRole('client')
    expect(getActiveRole()).toBe('coach')
    expect(getActiveToken()).toBe('coach-token')

    useSessionStore.getState().startSession('client', 'client-token')
    useSessionStore.getState().setActiveRole('coach')
    expect(getActiveRole()).toBe('coach')
    expect(getActiveToken()).toBe('coach-token')
  })

  it('encerra somente a sessão solicitada e preserva a outra', () => {
    useSessionStore.getState().startSession('client', 'client-token')
    useSessionStore.getState().startSession('coach', 'coach-token')

    useSessionStore.getState().endSession('coach')

    expect(getActiveRole()).toBeNull()
    expect(getActiveToken()).toBeNull()
    expect(getSessionToken('coach')).toBeNull()
    expect(getSessionToken('client')).toBe('client-token')
  })

  it('encerra somente a sessão ativa quando o token ativo expira', () => {
    useSessionStore.getState().startSession('coach', 'coach-token')
    useSessionStore.getState().startSession('client', 'client-token')

    useSessionStore.getState().endActiveSession()

    expect(getActiveRole()).toBeNull()
    expect(getSessionToken('client')).toBeNull()
    expect(getSessionToken('coach')).toBe('coach-token')
  })

  it('guarda apenas o token do aluno na sessão local', () => {
    useSessionStore.getState().startSession('client', 'old-token')
    useSessionStore.getState().startSession('client', 'new-token')

    expect(useSessionStore.getState().sessions.client).toEqual({
      token: 'new-token',
    })
  })
})

describe('clearPersistedSession', () => {
  it('remove a sessão do papel do storage SEM mutar o store em memória', () => {
    useSessionStore.getState().startSession('coach', 'coach-token')

    clearPersistedSession('coach')

    // store em memória intacto — é o que evita os route guards reativos
    // dispararem e iniciarem um novo /authorize durante o logout
    expect(getSessionToken('coach')).toBe('coach-token')
    expect(getActiveRole()).toBe('coach')
    // storage persistido já sem a sessão do papel
    expect(readPersisted()?.sessions).not.toHaveProperty('coach')
    expect(readPersisted()?.activeRole).toBeNull()
  })

  it('preserva a sessão do outro papel no storage', () => {
    useSessionStore.getState().startSession('client', 'aluno-token')
    useSessionStore.getState().startSession('coach', 'coach-token')

    clearPersistedSession('coach')

    const persisted = readPersisted()
    expect(persisted?.sessions).not.toHaveProperty('coach')
    expect(persisted?.sessions['client']?.token).toBe('aluno-token')
  })

  it('mantém o activeRole persistido quando não é o papel removido', () => {
    useSessionStore.getState().startSession('coach', 'coach-token')
    useSessionStore.getState().startSession('client', 'aluno-token')
    // active = 'client' (sessão mais recente)

    clearPersistedSession('coach')

    expect(readPersisted()?.activeRole).toBe('client')
  })

  it('é no-op quando não há nada persistido', () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)

    expect(() => clearPersistedSession('coach')).not.toThrow()
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('limpa o storage por segurança quando está corrompido', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not-json{')

    clearPersistedSession('coach')

    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})
