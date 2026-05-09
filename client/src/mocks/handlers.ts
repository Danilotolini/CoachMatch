import { http, HttpResponse, delay } from 'msw'
import type {
  Coach,
  CoachUpdatePayload,
  Gym,
  GymSuggestPayload,
  GymSuggestResponse,
  PaginatedResponse,
  Specialty,
  UploadUrlResponse,
  PaymentPayload,
  Transaction,
} from '@/types/api'
import { gyms, initialCoach, specialties } from '@/mocks/fixtures'

const MOCK_S3_URL = 'https://mock-s3.local/upload'

const state = {
  coach: { ...initialCoach },
  transactions: new Map<string, Transaction>(),
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
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

function matchesExact(haystack: string, needle: string | null): boolean {
  if (!needle) return true
  return haystack.toLowerCase() === needle.toLowerCase()
}

function nowIso(): string {
  return new Date().toISOString()
}

export const handlers = [
  http.get('*/coaches/me', async () => {
    await delay(200)
    return HttpResponse.json<Coach>(state.coach)
  }),

  http.put('*/coaches/me', async ({ request }) => {
    await delay(300)
    const payload = (await request.json()) as CoachUpdatePayload
    state.coach = {
      ...state.coach,
      profile: { ...state.coach.profile, ...(payload.profile ?? {}) },
      work_location: payload.work_location ?? state.coach.work_location,
      updatedAt: nowIso(),
    }
    return HttpResponse.json<Coach>(state.coach)
  }),

  http.post('*/coaches/me/submit-for-review', async () => {
    await delay(250)
    if (state.coach.status !== 'PENDING_PROFILE') {
      return HttpResponse.json({ error: 'Estado atual não permite submissão.' }, { status: 409 })
    }
    state.coach = { ...state.coach, status: 'PROFILE_REVIEW', updatedAt: nowIso() }
    return HttpResponse.json<Coach>(state.coach)
  }),

  http.get('*/specialties', async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const page = getNumberParam(url, 'page', 1)
    const limit = getNumberParam(url, 'limit', 20)
    const filtered = specialties.filter(
      (s: Specialty) => matchesSearch(s.label, search) || matchesSearch(s.id, search),
    )
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
      (g: Gym) =>
        (matchesSearch(g.name, search) ||
          matchesSearch(g.address, search) ||
          matchesSearch(g.neighborhood, search)) &&
        matchesExact(g.city, city),
    )
    return HttpResponse.json(paginate(filtered, page, limit))
  }),

  http.post('*/gyms/suggest', async ({ request }) => {
    await delay(250)
    const payload = (await request.json()) as GymSuggestPayload
    const newGym: Gym = {
      gymId: `gym_${Math.random().toString(16).slice(2, 10)}`,
      name: payload.name,
      address: payload.address,
      city: payload.city,
      state: payload.state.toUpperCase(),
      neighborhood: payload.neighborhood,
      coordinates: payload.coordinates,
    }
    return HttpResponse.json<GymSuggestResponse>(
      {
        data: newGym,
        message: 'Sugestão registrada com sucesso. Aguardando aprovação.',
      },
      { status: 201 },
    )
  }),

  http.post('*/upload-url', async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as { filename: string; contentType: string }
    const key = `uploads/${String(Date.now())}-${body.filename}`
    return HttpResponse.json<UploadUrlResponse>({
      key,
      expiresIn: 300,
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

  // Dev-only: simula aprovação manual do admin (não existe no swagger).
  http.post('*/dev/approve-coach', async () => {
    await delay(150)
    state.coach = { ...state.coach, status: 'APPROVED', updatedAt: nowIso() }
    return HttpResponse.json<Coach>(state.coach)
  }),

  // Payment Handlers

  http.post('*/payments', async ({ request }) => {
    await delay(800)
    const payload = (await request.json()) as PaymentPayload
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const transactionId = `txn_${Date.now()}`

    let status: 'approved' | 'refused' | 'pending' = 'approved'
    if (payload.method === 'credit_card' && payload.card) {
      const cardNumber = payload.card.number.replace(/\s/g, '')
      if (cardNumber === '4222222222222222') status = 'refused'
      else if (cardNumber === '4333333333333333') status = 'pending'
    }

    const split =
      status !== 'refused'
        ? {
            platformFee: Math.floor(payload.amount * 0.1),
            coachAmount: Math.floor(payload.amount * 0.9),
          }
        : undefined

    const transaction: Transaction = {
      transactionId,
      sessionId: payload.sessionId,
      coachId: payload.coachId,
      studentId: payload.studentId,
      method: payload.method,
      amount: payload.amount,
      status,
      ...(payload.card && { cardLastFour: payload.card.number.slice(-4) }),
      ...(split && { split }),
      createdAt: new Date().toISOString(),
    }

    state.transactions.set(transactionId, transaction)
    return HttpResponse.json<Transaction>(transaction, { status: 201 })
  }),

  http.get('*/payments/:transactionId', async ({ params }) => {
    await delay(200)
    const { transactionId } = params
    const transaction = state.transactions.get(String(transactionId))

    if (!transaction) {
      return HttpResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json<Transaction>(transaction)
  }),

  http.post('*/payments/:transactionId/refund', async ({ params }) => {
    await delay(600)
    const { transactionId } = params
    const transaction = state.transactions.get(String(transactionId))

    if (!transaction) {
      return HttpResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (transaction.status === 'refused') {
      return HttpResponse.json(
        { error: 'Cannot refund a refused transaction' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const refundId = `refund_${Date.now()}`
    const refundTxn: Transaction = {
      transactionId: refundId,
      sessionId: transaction.sessionId,
      coachId: transaction.coachId,
      studentId: transaction.studentId,
      method: transaction.method,
      amount: -transaction.amount,
      status: 'approved',
      ...(transaction.cardLastFour !== undefined && { cardLastFour: transaction.cardLastFour }),
      ...(transaction.split && {
        split: {
          platformFee: -transaction.split.platformFee,
          coachAmount: -transaction.split.coachAmount,
        },
      }),
      createdAt: new Date().toISOString(),
    }

    state.transactions.set(refundId, refundTxn)
    return HttpResponse.json<Transaction>(refundTxn, { status: 201 })
  }),
]
