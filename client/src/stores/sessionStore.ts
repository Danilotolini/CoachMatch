import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Role = 'coach' | 'client'

interface CoachSession {
  token: string
}

interface ClientSession {
  token: string
}

interface Sessions {
  coach?: CoachSession
  client?: ClientSession
}

function sessionsWithout(sessions: Sessions, role: Role): Sessions {
  if (role === 'coach') {
    return sessions.client ? { client: sessions.client } : {}
  }
  return sessions.coach ? { coach: sessions.coach } : {}
}

export const SESSION_STORAGE_KEY = 'coachmatch:session'

interface SessionStore {
  activeRole: Role | null
  sessions: Sessions
  startSession: (role: Role, token: string) => void
  endSession: (role: Role) => void
  endActiveSession: () => void
  setActiveRole: (role: Role) => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      activeRole: null,
      sessions: {},

      startSession: (role, token) => {
        set((state) => {
          if (role === 'client') {
            return {
              activeRole: 'client',
              sessions: {
                ...state.sessions,
                client: { token },
              },
            }
          }
          return {
            activeRole: 'coach',
            sessions: { ...state.sessions, coach: { token } },
          }
        })
      },

      endSession: (role) => {
        set((state) => ({
          sessions: sessionsWithout(state.sessions, role),
          activeRole: state.activeRole === role ? null : state.activeRole,
        }))
      },

      endActiveSession: () => {
        set((state) => {
          if (!state.activeRole) return state
          return { sessions: sessionsWithout(state.sessions, state.activeRole), activeRole: null }
        })
      },

      setActiveRole: (role) => {
        set((state) => {
          if (!state.sessions[role]) return state
          return { activeRole: role }
        })
      },
    }),
    { name: SESSION_STORAGE_KEY, storage: createJSONStorage(() => sessionStorage) },
  ),
)

// Remove a sessão de um papel direto do storage persistido, SEM tocar no store
// em memória. É usado no logout via Cognito: mutar o store (via `endSession`)
// dispararia os route guards reativos, que redirecionam para /{role}/login e
// iniciam um novo /authorize. Essa segunda navegação corre contra o redirect
// para o /logout do Cognito e pode sobrescrevê-lo — o Hosted UI nunca encerra a
// sessão e devolve um code novo (re-login silencioso). Como o store re-hidrata
// do storage ao voltarmos do Hosted UI, a sessão some de fato, sem corrida.
export function clearPersistedSession(role: Role): void {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      state?: { activeRole?: Role | null; sessions?: Sessions }
    }
    const state = parsed.state
    if (!state) return
    state.sessions = sessionsWithout(state.sessions ?? {}, role)
    if (state.activeRole === role) state.activeRole = null
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // storage corrompido: limpa tudo por segurança
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }
}

export function getActiveToken(): string | null {
  const { activeRole, sessions } = useSessionStore.getState()
  if (!activeRole) return null
  return sessions[activeRole]?.token ?? null
}

export function getSessionToken(role: Role): string | null {
  return useSessionStore.getState().sessions[role]?.token ?? null
}

export function getActiveRole(): Role | null {
  return useSessionStore.getState().activeRole
}
