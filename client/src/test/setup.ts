import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// env.ts lança no load se essas vars não existirem — precisa stubar antes
// que qualquer módulo que dependa dele seja importado pelos testes.
vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id')
vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.us-east-1.amazoncognito.com')

const { server } = await import('@/mocks/server')
const { useSessionStore } = await import('@/stores/sessionStore')

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  useSessionStore.setState({ activeRole: null, sessions: {} })
})

afterAll(() => {
  server.close()
})
