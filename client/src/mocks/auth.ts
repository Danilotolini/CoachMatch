import { type Role, useSessionStore } from '@/stores/sessionStore'

const MOCK_CLAIMS: Record<Role, Record<string, string>> = {
  client: {
    name: 'Aluno Demo',
    given_name: 'Aluno',
    family_name: 'Demo',
    email: 'aluno@coachmatch.app',
  },
  coach: {
    name: 'Treinador Demo',
    given_name: 'Treinador',
    family_name: 'Demo',
    email: 'treinador@coachmatch.app',
  },
}

function base64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildMockIdToken(role: Role): string {
  const payload = {
    ...MOCK_CLAIMS[role],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }
  return ['eyJhbGciOiJub25lIn0', base64Url(JSON.stringify(payload)), 'mock-signature'].join('.')
}

export function installMockSession(): void {
  const store = useSessionStore.getState()
  if (!store.sessions.coach?.token) {
    store.startSession('coach', buildMockIdToken('coach'))
  }
  if (!store.sessions.client?.token) {
    store.startSession('client', buildMockIdToken('client'))
  }
}
