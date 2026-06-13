import { http, HttpResponse, delay } from 'msw'
import type {
  Client,
  ClientHealthPayload,
  ClientProfilePayload,
  ClientStatus,
  Coach,
  CoachListItem,
  CoachSearchSort,
  CoachStatus,
  CoachVisibility,
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

const wait = (ms: number) => (import.meta.env.MODE === 'test' ? Promise.resolve() : delay(ms))

const MOCK_S3_URL = 'https://mock-s3.local/upload'
const MOCK_COACH_STORAGE_KEY = 'coachmatch:mock:coach'
const MOCK_CLIENT_STORAGE_KEY = 'coachmatch:mock:client'

const coachSearchFixtures: CoachListItem[] = [
  {
    coachId: 'coach_marcos',
    name: 'Marcos Vieira',
    specialties: ['Musculação', 'Hipertrofia'],
    rating: 4.9,
    priceFrom: 180,
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    nextAvailability: 'Hoje às 18h',
    photo: '/assets/images/onboarding-hero-mobile.png',
  },
  {
    coachId: 'coach_julia',
    name: 'Julia Ramos',
    specialties: ['Funcional', 'Mobilidade'],
    rating: 4.8,
    priceFrom: 150,
    neighborhood: 'Vila Madalena',
    city: 'São Paulo',
    nextAvailability: 'Amanhã cedo',
    photo: null,
  },
  {
    coachId: 'coach_rafael',
    name: 'Rafael Souza',
    specialties: ['Crossfit', 'Condicionamento'],
    rating: 5,
    priceFrom: 210,
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    nextAvailability: 'Sábado às 10h',
    photo: null,
  },
  {
    coachId: 'coach_bia',
    name: 'Bia Martins',
    specialties: ['Reabilitação', 'Pilates'],
    rating: 4.7,
    priceFrom: 165,
    neighborhood: 'Perdizes',
    city: 'São Paulo',
    nextAvailability: 'Segunda às 9h',
    photo: null,
  },
  {
    coachId: 'coach_caio',
    name: 'Caio Lima',
    specialties: ['Corrida', 'Performance'],
    rating: 4.6,
    priceFrom: 130,
    neighborhood: 'Moema',
    city: 'São Paulo',
    nextAvailability: 'Hoje às 20h',
    photo: null,
  },
  {
    coachId: 'coach_larissa',
    name: 'Larissa Nunes',
    specialties: ['Yoga', 'Mobilidade'],
    rating: 4.9,
    priceFrom: 120,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    nextAvailability: 'Quinta às 7h',
    photo: null,
  },
  {
    coachId: 'coach_thiago',
    name: 'Thiago Rocha',
    specialties: ['Musculação', 'Emagrecimento'],
    rating: 4.5,
    priceFrom: 95,
    neighborhood: 'Tatuapé',
    city: 'São Paulo',
    nextAvailability: 'Sexta às 17h',
    photo: null,
  },
  {
    coachId: 'coach_natalia',
    name: 'Natália Alves',
    specialties: ['Funcional', 'Gestantes'],
    rating: 4.8,
    priceFrom: 175,
    neighborhood: 'Leblon',
    city: 'Rio de Janeiro',
    nextAvailability: 'Amanhã às 16h',
    photo: null,
  },
  {
    coachId: 'coach_andre',
    name: 'André Ferreira',
    specialties: ['Natação', 'Condicionamento'],
    rating: 4.4,
    priceFrom: 140,
    neighborhood: 'Botafogo',
    city: 'Rio de Janeiro',
    nextAvailability: 'Terça às 8h',
    photo: null,
  },
  {
    coachId: 'coach_manu',
    name: 'Manu Costa',
    specialties: ['Dança', 'Funcional'],
    rating: 4.7,
    priceFrom: 110,
    neighborhood: 'Boa Viagem',
    city: 'Recife',
    nextAvailability: 'Hoje às 19h',
    photo: null,
  },
  {
    coachId: 'coach_gustavo',
    name: 'Gustavo Melo',
    specialties: ['Lutas', 'Boxe'],
    rating: 4.6,
    priceFrom: 155,
    neighborhood: 'Casa Forte',
    city: 'Recife',
    nextAvailability: 'Sábado às 11h',
    photo: null,
  },
  {
    coachId: 'coach_priscila',
    name: 'Priscila Duarte',
    specialties: ['Reabilitação', 'Mobilidade'],
    rating: 4.95,
    priceFrom: 220,
    neighborhood: 'Jardins',
    city: 'São Paulo',
    nextAvailability: 'Quarta às 14h',
    photo: null,
  },
]

function buildInitialCoach(): Coach {
  return {
    ...initialCoach,
    profile: { ...initialCoach.profile },
    work_location: [...initialCoach.work_location],
  }
}

function buildInitialClient(): Client {
  return {
    clientId: 'client_demo',
    email: 'aluno@coachmatch.app',
    status: 'ONBOARDING_PROFILE',
    name: null,
    phone: null,
    birthDate: null,
    gender: null,
    cep: null,
    city: null,
    state: null,
    radius: null,
    goal: null,
    health: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function readStoredCoach(): Coach | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(MOCK_COACH_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Coach
  } catch {
    localStorage.removeItem(MOCK_COACH_STORAGE_KEY)
    return null
  }
}

function writeStoredCoach(coach: Coach): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOCK_COACH_STORAGE_KEY, JSON.stringify(coach))
}

function readStoredClient(): Client | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(MOCK_CLIENT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Client
  } catch {
    localStorage.removeItem(MOCK_CLIENT_STORAGE_KEY)
    return null
  }
}

function writeStoredClient(client: Client): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOCK_CLIENT_STORAGE_KEY, JSON.stringify(client))
}

const state = {
  coach: readStoredCoach() ?? buildInitialCoach(),
  client: readStoredClient() ?? buildInitialClient(),
  transactions: new Map<string, Transaction>(),
}

function setCoach(coach: Coach): Coach {
  state.coach = coach
  writeStoredCoach(coach)
  return state.coach
}

function resetCoach(): Coach {
  return setCoach(buildInitialCoach())
}

function setClient(client: Client): Client {
  state.client = client
  writeStoredClient(client)
  return state.client
}

function resetClient(): Client {
  return setClient(buildInitialClient())
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

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getArrayParam(url: URL, key: string): string[] {
  return [...url.searchParams.getAll(key), ...url.searchParams.getAll(key.replace('[]', ''))]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function sortCoachResults(items: CoachListItem[], sort: CoachSearchSort): CoachListItem[] {
  return [...items].sort((a, b) => {
    if (sort === 'price_asc') return a.priceFrom - b.priceFrom
    if (sort === 'price_desc') return b.priceFrom - a.priceFrom
    return b.rating - a.rating
  })
}

function nowIso(): string {
  return new Date().toISOString()
}

export const handlers = [
  http.get('*/clients/me', async () => {
    await wait(150)
    return HttpResponse.json<Client>(state.client)
  }),

  http.post('*/clients/me/health', async ({ request }) => {
    await wait(200)
    const payload = (await request.json()) as ClientHealthPayload
    if (!payload.lgpdConsent || !payload.medicalDisclaimer) {
      return HttpResponse.json({ error: 'Consentimentos obrigatórios.' }, { status: 400 })
    }
    const client = setClient({ ...state.client, status: 'ACTIVE', updatedAt: nowIso() })
    return HttpResponse.json<Client>(client)
  }),

  http.post('*/clients/me/profile', async ({ request }) => {
    await wait(200)
    void ((await request.json()) as ClientProfilePayload)
    const client = setClient({ ...state.client, status: 'ONBOARDING_HEALTH', updatedAt: nowIso() })
    return HttpResponse.json<Client>(client)
  }),

  http.get('*/coaches/me', async () => {
    await wait(200)
    return HttpResponse.json<Coach>(state.coach)
  }),

  http.get('*/coaches', async ({ request }) => {
    await wait(180)
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const specialtiesFilter = getArrayParam(url, 'specialties[]')
    const address = url.searchParams.get('address')
    const priceMin = url.searchParams.get('priceMin')
    const priceMax = url.searchParams.get('priceMax')
    const availableOn = url.searchParams.get('availableOn')
    const page = getNumberParam(url, 'page', 1)
    const limit = getNumberParam(url, 'limit', 12)
    const sort = (url.searchParams.get('sort') ?? 'rating') as CoachSearchSort

    const filtered = coachSearchFixtures.filter((coach) => {
      const searchable = normalizeText(
        [coach.name, coach.city, coach.neighborhood, ...coach.specialties].join(' '),
      )
      const matchesQuery = !query || searchable.includes(normalizeText(query))
      const matchesSpecialty =
        specialtiesFilter.length === 0 ||
        specialtiesFilter.some((item) =>
          coach.specialties.some((specialty) =>
            normalizeText(specialty).includes(normalizeText(item)),
          ),
        )
      const matchesAddress =
        !address ||
        normalizeText(`${coach.neighborhood} ${coach.city}`).includes(normalizeText(address))
      const matchesMin = !priceMin || coach.priceFrom >= Number(priceMin)
      const matchesMax = !priceMax || coach.priceFrom <= Number(priceMax)
      const matchesAvailability = !availableOn || coach.nextAvailability.length > 0
      return (
        matchesQuery &&
        matchesSpecialty &&
        matchesAddress &&
        matchesMin &&
        matchesMax &&
        matchesAvailability
      )
    })

    return HttpResponse.json(paginate(sortCoachResults(filtered, sort), page, limit))
  }),

  http.put('*/coaches/me', async ({ request }) => {
    await wait(300)
    const payload = (await request.json()) as CoachUpdatePayload
    const coach = setCoach({
      ...state.coach,
      profile: { ...state.coach.profile, ...(payload.profile ?? {}) },
      work_location: payload.work_location ?? state.coach.work_location,
      updatedAt: nowIso(),
    })
    return HttpResponse.json<Coach>(coach)
  }),

  http.post('*/coaches/me/submit-for-review', async () => {
    await wait(250)
    if (state.coach.status !== 'ONBOARDING_PROFILE' && state.coach.status !== 'REJECTED') {
      return HttpResponse.json({ error: 'Estado atual não permite submissão.' }, { status: 409 })
    }
    const coach = setCoach({ ...state.coach, status: 'PENDING_REVIEW', updatedAt: nowIso() })
    return HttpResponse.json<Coach>(coach)
  }),

  http.get('*/specialties', async ({ request }) => {
    await wait(150)
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
    await wait(150)
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
    await wait(250)
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
    await wait(150)
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
    await wait(400)
    return new HttpResponse(null, { status: 204 })
  }),

  // IBGE (terceiro). Mock default para testes.
  http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados', async () => {
    await wait(50)
    return HttpResponse.json([
      { id: 35, sigla: 'SP', nome: 'São Paulo' },
      { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' },
      { id: 26, sigla: 'PE', nome: 'Pernambuco' },
    ])
  }),

  http.get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios', async () => {
    await wait(50)
    return HttpResponse.json([
      {
        id: 3550308,
        nome: 'São Paulo',
        microrregiao: { mesorregiao: { UF: { sigla: 'SP' } } },
      },
      {
        id: 3304557,
        nome: 'Rio de Janeiro',
        microrregiao: { mesorregiao: { UF: { sigla: 'RJ' } } },
      },
      {
        id: 2611606,
        nome: 'Recife',
        microrregiao: { mesorregiao: { UF: { sigla: 'PE' } } },
      },
    ])
  }),

  // ViaCEP (terceiro). Mock default para testes.
  http.get('https://viacep.com.br/ws/:uf/:city/:logradouro/json/', async () => {
    await wait(50)
    return HttpResponse.json([
      {
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      },
    ])
  }),

  http.post('*/dev/coach/status', async ({ request }) => {
    await wait(150)
    const payload = (await request.json()) as { status: CoachStatus }
    const coach = setCoach({ ...state.coach, status: payload.status, updatedAt: nowIso() })
    return HttpResponse.json<Coach>(coach)
  }),

  http.post('*/dev/client/onboarded', async ({ request }) => {
    await wait(150)
    const payload = (await request.json()) as { status: ClientStatus }
    const client = setClient({ ...state.client, status: payload.status, updatedAt: nowIso() })
    return HttpResponse.json<Client>(client)
  }),

  http.post('*/dev/coach/visibility', async ({ request }) => {
    await wait(150)
    const payload = (await request.json()) as { visibility: CoachVisibility }
    const coach = setCoach({ ...state.coach, visibility: payload.visibility, updatedAt: nowIso() })
    return HttpResponse.json<Coach>(coach)
  }),

  http.put('*/dev/coach/profile', async ({ request }) => {
    await wait(150)
    const payload = (await request.json()) as CoachUpdatePayload
    const coach = setCoach({
      ...state.coach,
      profile: { ...state.coach.profile, ...(payload.profile ?? {}) },
      work_location: payload.work_location ?? state.coach.work_location,
      updatedAt: nowIso(),
    })
    return HttpResponse.json<Coach>(coach)
  }),

  http.post('*/dev/reset', async () => {
    await wait(150)
    return HttpResponse.json<{ coach: Coach; client: Client }>({
      coach: resetCoach(),
      client: resetClient(),
    })
  }),

  http.post('*/dev/approve-coach', async () => {
    await wait(150)
    const coach = setCoach({ ...state.coach, status: 'APPROVED', updatedAt: nowIso() })
    return HttpResponse.json<Coach>(coach)
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
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return HttpResponse.json<Transaction>(transaction)
  }),

  http.post('*/payments/:transactionId/refund', async ({ params }) => {
    await delay(600)
    const { transactionId } = params
    const transaction = state.transactions.get(String(transactionId))

    if (!transaction) {
      return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.status === 'refused') {
      return HttpResponse.json({ error: 'Cannot refund a refused transaction' }, { status: 400 })
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
