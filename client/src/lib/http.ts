import { env } from '@/lib/env'
import {
  getToken,
  isTokenExpired,
  notifySessionExpired,
  type SessionExpiredDetail,
} from '@/lib/auth'
import { getSessionToken, type Role, useSessionStore } from '@/stores/sessionStore'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function parseApiErrors(error: unknown, fallback = 'Erro desconhecido'): string {
  if (error instanceof ApiError) {
    const errors = (error.body as Record<string, unknown> | null)?.['errors']
    if (Array.isArray(errors) && errors.length > 0) return String(errors[0])
  }
  return fallback
}

type QueryParamValue = string | number | readonly (string | number)[] | undefined
type QueryParams = Record<string, QueryParamValue>
interface RequestOptions {
  role?: Role
}

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

function getRequestToken(role?: Role): string | null {
  return role ? getSessionToken(role) : getToken()
}

function endRequestSession(role?: Role): void {
  if (role) {
    useSessionStore.getState().endSession(role)
    return
  }
  useSessionStore.getState().endActiveSession()
}

function sessionExpiredDetail(
  reason: SessionExpiredDetail['reason'],
  status: number,
  role?: Role,
): SessionExpiredDetail {
  return role ? { reason, status, role } : { reason, status }
}

async function request<T>(
  url: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const token = getRequestToken(options.role)
  if (token && isTokenExpired(token)) {
    endRequestSession(options.role)
    notifySessionExpired(sessionExpiredDetail('expired', 401, options.role))
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
      endRequestSession(options.role)
      notifySessionExpired(sessionExpiredDetail('unauthorized', res.status, options.role))
    }
    const errorText = await res.text()
    let errorBody: unknown
    try {
      errorBody = JSON.parse(errorText)
    } catch {
      /* not JSON */
    }
    throw new ApiError(
      res.status,
      `${init.method ?? 'GET'} ${url} failed (${String(res.status)})`,
      errorBody,
    )
  }

  const text = await res.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}

async function requestGetWithBody<T>(
  url: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const token = getRequestToken(options.role)
  if (token && isTokenExpired(token)) {
    endRequestSession(options.role)
    notifySessionExpired(sessionExpiredDetail('expired', 401, options.role))
    throw new ApiError(401, 'Sessão expirada.')
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.setRequestHeader('Content-Type', 'application/json')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        if (xhr.status === 401 || xhr.status === 403) {
          endRequestSession(options.role)
          notifySessionExpired(sessionExpiredDetail('unauthorized', xhr.status, options.role))
        }

        let errorBody: unknown
        try {
          errorBody = JSON.parse(xhr.responseText)
        } catch {
          /* not JSON */
        }
        reject(new ApiError(xhr.status, `GET ${url} failed (${String(xhr.status)})`, errorBody))
        return
      }

      resolve(xhr.responseText ? (JSON.parse(xhr.responseText) as T) : (undefined as T))
    }

    xhr.onerror = () => {
      reject(new ApiError(0, `GET ${url} failed (network error)`))
    }

    xhr.send(JSON.stringify(body))
  })
}

export function apiGet<T>(
  path: string,
  params?: QueryParams,
  options?: RequestOptions,
): Promise<T> {
  return request<T>(buildUrl(path, params), { method: 'GET' }, options)
}

export function apiPost<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    buildUrl(path),
    {
      method: 'POST',
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    },
    options,
  )
}

export function apiGetWithBody<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  if (body !== undefined) {
    return requestGetWithBody<T>(buildUrl(path, body as QueryParams), body, options)
  }

  return request<T>(
    buildUrl(path),
    {
      method: 'GET',
    },
    options,
  )
}

export function apiPut<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    buildUrl(path),
    {
      method: 'PUT',
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    },
    options,
  )
}

export function apiPatch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    buildUrl(path),
    {
      method: 'PATCH',
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    },
    options,
  )
}

export function apiDelete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    buildUrl(path),
    {
      method: 'DELETE',
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    },
    options,
  )
}
