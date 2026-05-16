import { type Role, useSessionStore } from '@/stores/sessionStore'

export function loginAs(role: Role, token = 'fake-jwt') {
  useSessionStore.getState().startSession(role, token)
}

export function clearAllSessions() {
  useSessionStore.setState({ activeRole: null, sessions: {} })
}
