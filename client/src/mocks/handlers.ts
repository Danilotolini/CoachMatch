import { http, HttpResponse, delay } from 'msw'
import type {
  CoachMe,
  CoachMePayload,
  Gym,
  PaginatedResponse,
  Specialty,
  UploadUrlResponse,
  PaymentPayload,
  Transaction,
} from '@/types/api'
import { gyms, initialCoachMe, specialties } from '@/mocks/fixtures'

const MOCK_S3_URL = 'https://mock-s3.local/upload'

const state = {
  coachMe: { ...initialCoachMe },
  transactions: new Map<string, Transaction>(),
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

  // ─── Payment Handlers ──────────────────────────────────────────────────────

  http.post('*/payments', async ({ request }) => {
    await delay(800)
    const payload = (await request.json()) as PaymentPayload
    const transactionId = `txn_${Date.now()}`

    // Determine payment status based on test card number
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
      cardLastFour: payload.card ? payload.card.number.slice(-4) : undefined,
      split,
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

  http.post('*/payments/:transactionId/refund', async ({ params, request }) => {
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

    // Create refund transaction
    const refundId = `refund_${Date.now()}`
    const refundTxn: Transaction = {
      transactionId: refundId,
      sessionId: transaction.sessionId,
      coachId: transaction.coachId,
      studentId: transaction.studentId,
      method: transaction.method,
      amount: -transaction.amount,
      status: 'approved',
      cardLastFour: transaction.cardLastFour,
      split: transaction.split
        ? {
            platformFee: -transaction.split.platformFee,
            coachAmount: -transaction.split.coachAmount,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    }

    state.transactions.set(refundId, refundTxn)
    return HttpResponse.json<Transaction>(refundTxn, { status: 201 })
  }),
]
