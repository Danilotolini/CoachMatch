import { env } from '@/lib/env'
import { getToken, isTokenExpired, notifySessionExpired } from '@/lib/auth'
import { useSessionStore } from '@/stores/sessionStore'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryParamValue = string | number | readonly (string | number)[] | undefined
type QueryParams = Record<string, QueryParamValue>

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(`${env.apiBaseUrl}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item))
        }
      } else if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const token = getToken()
  if (isTokenExpired(token)) {
    useSessionStore.getState().endActiveSession()
    notifySessionExpired({ reason: 'expired', status: 401 })
    throw new ApiError(401, 'Sessão expirada.')
  }

  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url, {
    ...init,
    headers,
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      useSessionStore.getState().endActiveSession()
      notifySessionExpired({ reason: 'unauthorized', status: res.status })
    }
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${url} failed (${String(res.status)})`)
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(buildUrl(path, params), { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(buildUrl(path), {
    method: 'POST',
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(buildUrl(path), {
    method: 'PUT',
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
}
