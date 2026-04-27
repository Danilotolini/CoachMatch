import { http, HttpResponse, delay } from 'msw'
import type {
  CoachMe,
  CoachMePayload,
  Gym,
  PaginatedResponse,
  Specialty,
  UploadUrlResponse,
} from '@/types/api'
import { gyms, initialCoachMe, specialties } from '@/mocks/fixtures'

const MOCK_S3_URL = 'https://mock-s3.local/upload'

const state = {
  coachMe: { ...initialCoachMe },
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const start = (page - 1) * limit
  return {
    data: items.slice(start, start + limit),
    page,
    limit,
    total: items.length,
  }
}

function getNumberParam(url: URL, key: string, fallback: number): number {
  const raw = url.searchParams.get(key)
  if (!raw) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function matchesSearch(haystack: string, needle: string | null): boolean {
  if (!needle) return true
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export const handlers = [
  http.get('*/coaches/me', async () => {
    await delay(200)
    return HttpResponse.json<CoachMe>(state.coachMe)
  }),

  http.put('*/coaches/me', async ({ request }) => {
    await delay(300)
    const payload = (await request.json()) as CoachMePayload
    const definedEntries = Object.entries(payload).filter(([, v]) => v !== undefined)
    const merged: CoachMe = {
      ...state.coachMe,
      ...(Object.fromEntries(definedEntries) as Partial<CoachMe>),
    }
    merged.status =
      state.coachMe.status === 'PROFILE_INCOMPLETE' ? 'PENDING_REVIEW' : state.coachMe.status
    state.coachMe = merged
    return HttpResponse.json<CoachMe>(state.coachMe)
  }),

  http.get('*/specialties', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const page = getNumberParam(url, 'page', 1)
    const limit = getNumberParam(url, 'limit', 20)
    const filtered = specialties.filter((s: Specialty) => matchesSearch(s.name, search))
    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  http.get('*/gyms', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const city = url.searchParams.get('city')
    const page = getNumberParam(url, 'page', 1)
    const limit = getNumberParam(url, 'limit', 20)
    const filtered = gyms.filter(
      (g: Gym) => matchesSearch(g.name, search) && matchesSearch(g.city, city),
    )
    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  http.post('*/gyms/suggest', async () => {
    await delay(250)
    return new HttpResponse(null, { status: 201 })
  }),

  http.post('*/upload-url', async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { filename: string; contentType: string }
    const key = `mock/${String(Date.now())}-${body.filename}`
    return HttpResponse.json<UploadUrlResponse>({
      key,
      upload: {
        url: MOCK_S3_URL,
        fields: {
          key,
          'Content-Type': body.contentType,
        },
      },
    })
  }),

  http.post(MOCK_S3_URL, async () => {
    await delay(400)
    return new HttpResponse(null, { status: 204 })
  }),
]
