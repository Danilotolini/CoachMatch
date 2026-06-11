import { useSessionStore } from '@/stores/sessionStore'
import { buildMockIdToken } from '@/dev/mockSession'

export function installMockSession(): void {
  const store = useSessionStore.getState()
  if (!store.sessions.coach?.token) {
    store.startSession('coach', buildMockIdToken('coach'))
  }
  if (!store.sessions.client?.token) {
    store.startSession('client', buildMockIdToken('client'))
  }
}
