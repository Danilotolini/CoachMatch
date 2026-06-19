import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// happy-dom não expõe localStorage/sessionStorage como globais — polyfill mínimo
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  key(index: number) {
    return [...this.store.keys()][index] ?? null
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
})
Object.defineProperty(globalThis, 'sessionStorage', {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
})

// env.ts lança no load se essas vars não existirem — precisa stubar antes
// que qualquer módulo que dependa dele seja importado pelos testes.
vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'test-client-id')
vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', 'test-client-secret')
vi.stubEnv('VITE_COGNITO_DOMAIN', 'test.auth.us-east-1.amazoncognito.com')
vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', '3rjn45koljliioocd5usijdv9s')
vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', 'test.auth.us-east-1.amazoncognito.com')

const { server } = await import('@/mocks/server')
const { useSessionStore } = await import('@/stores/sessionStore')
const { resetLoginRedirects } = await import('@/lib/loginRedirectGuard')

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  sessionStorage.clear()
  localStorage.clear()
  useSessionStore.setState({ activeRole: null, sessions: {} })
  resetLoginRedirects()
})

afterAll(() => {
  server.close()
})
