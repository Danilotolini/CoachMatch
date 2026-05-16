import { beforeEach, describe, expect, it } from 'vitest'
import {
  getActiveRole,
  getActiveToken,
  getSessionToken,
  useSessionStore,
} from './sessionStore'

beforeEach(() => {
  useSessionStore.setState({ activeRole: null, sessions: {} })
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
