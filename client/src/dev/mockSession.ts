import type { Role } from '@/stores/sessionStore'

const MOCK_CLAIMS: Record<Role, Record<string, string>> = {
  client: {
    sub: 'client_demo',
    name: 'Aluno Demo',
    given_name: 'Aluno',
    family_name: 'Demo',
    email: 'aluno@coachmatch.app',
  },
  coach: {
    sub: 'mock-coach-id',
    name: 'Treinador Demo',
    given_name: 'Treinador',
    family_name: 'Demo',
    email: 'treinador@coachmatch.app',
  },
}

function base64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function buildMockIdToken(role: Role): string {
  const payload = {
    ...MOCK_CLAIMS[role],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }
  return ['eyJhbGciOiJub25lIn0', base64Url(JSON.stringify(payload)), 'mock-signature'].join('.')
}
