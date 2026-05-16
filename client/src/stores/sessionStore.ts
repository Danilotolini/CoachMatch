import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'coach' | 'client'

interface CoachSession {
  token: string
}

interface ClientSession {
  token: string
  onboarded: boolean
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

interface SessionStore {
  activeRole: Role | null
  sessions: Sessions
  startSession: (role: Role, token: string) => void
  endSession: (role: Role) => void
  endActiveSession: () => void
  setActiveRole: (role: Role) => void
  markClientOnboarded: () => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      activeRole: null,
      sessions: {},

      startSession: (role, token) => {
        set((state) => {
          if (role === 'client') {
            const previous = state.sessions.client
            return {
              activeRole: 'client',
              sessions: {
                ...state.sessions,
                client: { token, onboarded: previous?.onboarded ?? false },
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

      markClientOnboarded: () => {
        set((state) => {
          const client = state.sessions.client
          if (!client) return state
          return {
            sessions: { ...state.sessions, client: { ...client, onboarded: true } },
          }
        })
      },
    }),
    { name: 'coachmatch:session' },
  ),
)

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
