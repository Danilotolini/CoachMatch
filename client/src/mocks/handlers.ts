import { http, HttpResponse, delay } from 'msw'
import type {
  CancelRequestResult,
  ClassStatusResult,
  Client,
  ClientHealthPayload,
  ClientProfilePayload,
  ClientStatus,
  Coach,
  CoachDetail,
  CoachListItem,
  CoachSearchResponse,
  CoachSummary,
  CoachStatus,
  CoachScheduleResponse,
  CoachScheduleSlot,
  CoachVisibility,
  CoachUpdatePayload,
  Gym,
  GymSuggestPayload,
  GymSuggestResponse,
  PaginatedResponse,
  Schedule,
  ScheduleApproveResult,
  ScheduleCancelResult,
  ScheduleCreatePayload,
  ScheduleRequestResult,
  ScheduleRequest,
  ScheduleRequestsResponse,
  ScheduleStatus,
  StudentCoachSchedulesResponse,
  StudentScheduleItem,
  StudentSchedulesResponse,
  Specialty,
  UploadUrlResponse,
  PaymentPayload,
  Transaction,
} from '@/types/api'
import { gyms, initialCoach, initialSchedules, mockStudents, specialties } from '@/mocks/fixtures'

const wait = (ms: number) => (import.meta.env.MODE === 'test' ? Promise.resolve() : delay(ms))

const MOCK_S3_URL = 'https://mock-s3.local/upload'
const MOCK_COACH_STORAGE_KEY = 'coachmatch:mock:coach'
const MOCK_CLIENT_STORAGE_KEY = 'coachmatch:mock:client'
const MOCK_SCHEDULE_STORAGE_KEY = 'coachmatch:mock:schedules'

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

const stateByCity: Record<string, string> = {
  'São Paulo': 'SP',
  'Rio de Janeiro': 'RJ',
  Recife: 'PE',
}

function coachToDetail(coach: CoachListItem): CoachDetail {
  const slug = coach.coachId.replace('coach_', '')
  return {
    coachId: coach.coachId,
    status: 'APPROVED',
    profile: {
      name: coach.name,
      phone: null,
      specialties: coach.specialties,
      cref: `CREF ${slug.toUpperCase()}-G/SP`,
      instagram: `@${normalizeText(coach.name).replace(/\s+/g, '.')}`,
      profile_video: false,
    },
    work_location: [
      {
        type: 'GYM',
        gymId: `gym_${slug}`,
        gym: {
          name: `Studio ${coach.name.split(' ')[0]}`,
          neighborhood: coach.neighborhood,
          city: coach.city,
          state: stateByCity[coach.city] ?? 'SP',
        },
      },
    ],
  }
}

const coachDetailFixtures: Partial<Record<string, CoachDetail>> = Object.fromEntries(
  coachSearchFixtures.map((coach) => [coach.coachId, coachToDetail(coach)]),
)

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
    status: 'PENDING_PROFILE',
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

function buildInitialSchedules(): Map<string, Schedule> {
  return new Map(initialSchedules.map((s) => [s.scheduleId, s]))
}

function readStoredSchedules(): Map<string, Schedule> | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(MOCK_SCHEDULE_STORAGE_KEY)
  if (!raw) return null
  try {
    const arr = JSON.parse(raw) as Schedule[]
    return new Map(arr.map((s) => [s.scheduleId, s]))
  } catch {
    localStorage.removeItem(MOCK_SCHEDULE_STORAGE_KEY)
    return null
  }
}

function writeStoredSchedules(schedules: Map<string, Schedule>): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MOCK_SCHEDULE_STORAGE_KEY, JSON.stringify([...schedules.values()]))
}

const state = {
  coach: readStoredCoach() ?? buildInitialCoach(),
  client: readStoredClient() ?? buildInitialClient(),
  schedules: readStoredSchedules() ?? buildInitialSchedules(),
  transactions: new Map<string, Transaction>(),
}

const seededStudentNameById = new Map(
  mockStudents.map((s): [string, string] => [s.studentId, s.name]),
)

// Espelha o backend: o nome do aluno é derivado do perfil na hora de listar pedidos,
// não fica gravado no request. Cai no nome do cliente logado ou nos alunos semeados.
function lookupStudentName(studentId: string): string | null {
  if (studentId === state.client.clientId) return state.client.name
  return seededStudentNameById.get(studentId) ?? null
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

function resetSchedules(): void {
  state.schedules = buildInitialSchedules()
  writeStoredSchedules(state.schedules)
}

function hasScheduleConflict(
  coachId: string,
  startDateTime: string,
  endDateTime: string,
  excludeId?: string,
): boolean {
  const newStart = new Date(startDateTime).getTime()
  const newEnd = new Date(endDateTime).getTime()
  for (const [id, s] of state.schedules) {
    if (excludeId && id === excludeId) continue
    if (s.coachId !== coachId || s.status === 'CANCELLED') continue
    const existStart = new Date(s.startDateTime).getTime()
    const existEnd = new Date(s.endDateTime).getTime()
    if (newStart < existEnd && newEnd > existStart) return true
  }
  return false
}

function newScheduleId(): string {
  return `avl_${crypto.randomUUID().replace(/-/g, '')}`
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

type GymListItem = Omit<Gym, 'gymId'> & {
  id: string
  active: 'True' | 'False'
}

function toGymListItem(gym: Gym): GymListItem {
  return {
    id: gym.gymId,
    name: gym.name,
    address: gym.address,
    city: gym.city,
    state: gym.state,
    neighborhood: gym.neighborhood,
    coordinates: gym.coordinates,
    active: 'True',
  }
}

function cursorPage<T extends { id: string }>(items: T[], cursor: string | null, limit: number) {
  let start = 0
  if (cursor) {
    try {
      const { gymId } = JSON.parse(atob(cursor)) as { gymId: string }
      const idx = items.findIndex((item) => item.id === gymId)
      if (idx >= 0) start = idx + 1
    } catch {
      start = 0
    }
  }
  const pageItems = items.slice(start, start + limit)
  const hasNext = start + limit < items.length
  const lastItem = pageItems.at(-1)
  return {
    items: pageItems,
    nextCursor: hasNext && lastItem ? btoa(JSON.stringify({ gymId: lastItem.id })) : null,
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

function paginateByLastKey<T, K extends Record<string, string>>(
  items: T[],
  lastKeyRaw: string | null,
  limit: number,
  getKey: (item: T) => K,
): { items: T[]; lastKey: K | null } {
  let start = 0
  if (lastKeyRaw) {
    try {
      const key = JSON.parse(lastKeyRaw) as Partial<K>
      const idx = items.findIndex((item) => {
        const itemKey = getKey(item)
        return Object.entries(key).every(([field, value]) => itemKey[field] === value)
      })
      if (idx >= 0) start = idx + 1
    } catch {
      start = 0
    }
  }
  const pageItems = items.slice(start, start + limit)
  const hasNext = start + limit < items.length
  const lastItem = pageItems.at(-1)
  return {
    items: pageItems,
    lastKey: hasNext && lastItem ? getKey(lastItem) : null,
  }
}

function coachToSummary(coach: CoachListItem): CoachSummary {
  return {
    coachId: coach.coachId,
    profile: {
      name: coach.name,
      phone: null,
      specialties: coach.specialties,
      cref: `CREF ${coach.coachId.replace('coach_', '').toUpperCase()}-G/SP`,
      instagram: `@${coach.coachId.replace('coach_', '')}`,
      profile_video: false,
    },
    work_location: [],
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export const handlers = [
  http.get('*/student/me', async () => {
    await wait(150)
    return HttpResponse.json<Client>(state.client)
  }),

  http.post('*/student/me/health', async ({ request }) => {
    await wait(200)
    const payload = (await request.json()) as ClientHealthPayload
    if (!payload.lgpdConsent || !payload.medicalDisclaimer) {
      return HttpResponse.json({ error: 'Consentimentos obrigatórios.' }, { status: 400 })
    }
    const client = setClient({ ...state.client, status: 'ACTIVE', updatedAt: nowIso() })
    return HttpResponse.json<Client>(client)
  }),

  http.post('*/student/me/profile', async ({ request }) => {
    await wait(200)
    const payload = (await request.json()) as ClientProfilePayload
    const client = setClient({
      ...state.client,
      name: payload.name,
      phone: payload.phone,
      birthDate: payload.birthDate,
      gender: payload.gender,
      cep: payload.cep,
      city: payload.city,
      state: payload.state,
      radius: payload.radius,
      goal: payload.goal,
      status: 'ONBOARDING_HEALTH',
      updatedAt: nowIso(),
    })
    return HttpResponse.json<Client>(client)
  }),

  http.get('*/coach/me', async () => {
    await wait(200)
    return HttpResponse.json<Coach>(state.coach)
  }),

  http.get('*/student/coaches', async ({ request }) => {
    await wait(180)
    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const specialtiesFilter = getArrayParam(url, 'specialties[]')
    const limit = getNumberParam(url, 'limit', 12)

    const filtered = coachSearchFixtures
      .filter((coach) => {
        const searchable = normalizeText([coach.name, coach.neighborhood, ...coach.specialties].join(' '))
        const matchesQuery = !query || searchable.includes(normalizeText(query))
        const matchesSpecialty =
          specialtiesFilter.length === 0 ||
          specialtiesFilter.some((item) => coach.specialties.includes(item))
        return matchesQuery && matchesSpecialty
      })
      // Espelha o backend: ordem estável por coachId.
      .sort((a, b) => a.coachId.localeCompare(b.coachId))

    const { items, lastKey } = paginateByLastKey(
      filtered,
      url.searchParams.get('lastKey'),
      limit,
      (coach) => ({ coachId: coach.coachId }),
    )

    return HttpResponse.json<CoachSearchResponse>({
      data: items.map(coachToSummary),
      meta: { limit, lastKey },
    })
  }),

  http.put('*/coach/me', async ({ request }) => {
    await wait(300)
    const payload = (await request.json()) as CoachUpdatePayload
    const coach = setCoach({
      ...state.coach,
      // O coach já nasce ativo na plataforma; completar o perfil mantém o status APPROVED.
      status: 'APPROVED',
      profile: { ...state.coach.profile, ...(payload.profile ?? {}) },
      work_location: payload.work_location ?? state.coach.work_location,
      updatedAt: nowIso(),
    })
    return HttpResponse.json<Coach>(coach)
  }),

  http.get('*/coach/specialties', async ({ request }) => {
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

  http.get('*/coach/gyms', async ({ request }) => {
    await wait(150)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const city = url.searchParams.get('city')
    const cursor = url.searchParams.get('cursor')
    const limit = getNumberParam(url, 'limit', 20)
    const filtered = gyms.filter(
      (g: Gym) =>
        (matchesSearch(g.name, search) ||
          matchesSearch(g.address, search) ||
          matchesSearch(g.neighborhood, search)) &&
        matchesExact(g.city, city),
    )
    return HttpResponse.json(cursorPage(filtered.map(toGymListItem), cursor, limit))
  }),

  http.post('*/coach/gyms/suggest', async ({ request }) => {
    await wait(250)
    const payload = (await request.json()) as GymSuggestPayload
    const newGym: Gym = {
      gymId: `gym_${Math.random().toString(16).slice(2, 10)}`,
      name: payload.name,
      address: payload.address,
      city: payload.city,
      state: payload.state.toUpperCase(),
      neighborhood: payload.neighborhood,
      coordinates: null,
    }
    return HttpResponse.json<GymSuggestResponse>(
      {
        data: newGym,
        message: 'Sugestão registrada com sucesso. Aguardando aprovação.',
      },
      { status: 201 },
    )
  }),

  // ── Student — Recursos ─────────────────────────────────────────────────────

  http.get('*/student/specialties', async ({ request }) => {
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

  http.get('*/student/gyms', async ({ request }) => {
    await wait(150)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const city = url.searchParams.get('city')
    const cursor = url.searchParams.get('cursor')
    const limit = getNumberParam(url, 'limit', 20)
    const filtered = gyms.filter(
      (g: Gym) =>
        (matchesSearch(g.name, search) ||
          matchesSearch(g.address, search) ||
          matchesSearch(g.neighborhood, search)) &&
        matchesExact(g.city, city),
    )
    return HttpResponse.json(cursorPage(filtered.map(toGymListItem), cursor, limit))
  }),

  http.post('*/student/gyms/suggest', async ({ request }) => {
    await wait(250)
    const payload = (await request.json()) as GymSuggestPayload
    const newGym: Gym = {
      gymId: `gym_${Math.random().toString(16).slice(2, 10)}`,
      name: payload.name,
      address: payload.address,
      city: payload.city,
      state: payload.state.toUpperCase(),
      neighborhood: payload.neighborhood,
      coordinates: null,
    }
    return HttpResponse.json<GymSuggestResponse>(
      {
        data: newGym,
        message: 'Sugestão registrada com sucesso. Aguardando aprovação.',
      },
      { status: 201 },
    )
  }),

  http.post('*/coach/upload-url', async ({ request }) => {
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
      { id: 12, sigla: 'AC', nome: 'Acre' },
      { id: 27, sigla: 'AL', nome: 'Alagoas' },
      { id: 13, sigla: 'AM', nome: 'Amazonas' },
      { id: 16, sigla: 'AP', nome: 'Amapá' },
      { id: 29, sigla: 'BA', nome: 'Bahia' },
      { id: 23, sigla: 'CE', nome: 'Ceará' },
      { id: 53, sigla: 'DF', nome: 'Distrito Federal' },
      { id: 32, sigla: 'ES', nome: 'Espírito Santo' },
      { id: 52, sigla: 'GO', nome: 'Goiás' },
      { id: 21, sigla: 'MA', nome: 'Maranhão' },
      { id: 31, sigla: 'MG', nome: 'Minas Gerais' },
      { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
      { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
      { id: 15, sigla: 'PA', nome: 'Pará' },
      { id: 25, sigla: 'PB', nome: 'Paraíba' },
      { id: 41, sigla: 'PR', nome: 'Paraná' },
      { id: 26, sigla: 'PE', nome: 'Pernambuco' },
      { id: 22, sigla: 'PI', nome: 'Piauí' },
      { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' },
      { id: 24, sigla: 'RN', nome: 'Rio Grande do Norte' },
      { id: 43, sigla: 'RS', nome: 'Rio Grande do Sul' },
      { id: 11, sigla: 'RO', nome: 'Rondônia' },
      { id: 14, sigla: 'RR', nome: 'Roraima' },
      { id: 42, sigla: 'SC', nome: 'Santa Catarina' },
      { id: 28, sigla: 'SE', nome: 'Sergipe' },
      { id: 35, sigla: 'SP', nome: 'São Paulo' },
      { id: 17, sigla: 'TO', nome: 'Tocantins' },
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
    resetSchedules()
    return HttpResponse.json<{ coach: Coach; client: Client }>({
      coach: resetCoach(),
      client: resetClient(),
    })
  }),

  // ── Coach — Agenda ─────────────────────────────────────────────────────────

  http.get('*/coach/schedule', async ({ request }) => {
    await wait(200)
    let params: { startDateTime?: string; endDateTime?: string } = {}
    try {
      params = (await request.json()) as typeof params
    } catch {
      const url = new URL(request.url)
      const startDateTime = url.searchParams.get('startDateTime')
      const endDateTime = url.searchParams.get('endDateTime')
      params = {
        ...(startDateTime && { startDateTime }),
        ...(endDateTime && { endDateTime }),
      }
    }
    const result = [...state.schedules.values()].filter((s) => {
      if (s.coachId !== state.coach.coachId) return false
      if (params.startDateTime && s.startDateTime < params.startDateTime) return false
      if (params.endDateTime && s.endDateTime > params.endDateTime) return false
      return true
    })
    return HttpResponse.json<CoachScheduleResponse>({
      coachId: state.coach.coachId,
      startDateTime: params.startDateTime ?? '',
      endDateTime: params.endDateTime ?? '',
      count: result.length,
      schedules: result,
    })
  }),

  http.post('*/coach/schedule', async ({ request }) => {
    await wait(300)
    const payload = (await request.json()) as ScheduleCreatePayload
    const missing = ['gymId', 'specialtyId', 'startDateTime', 'endDateTime', 'price'].filter(
      (f) => !payload[f as keyof ScheduleCreatePayload],
    )
    if (missing.length > 0) {
      return HttpResponse.json(
        { errors: [`Campos obrigatórios ausentes: ${missing.join(', ')}.`] },
        { status: 400 },
      )
    }
    if (hasScheduleConflict(state.coach.coachId, payload.startDateTime, payload.endDateTime)) {
      return HttpResponse.json(
        { errors: ['Conflito de horário com uma disponibilidade existente.'] },
        { status: 422 },
      )
    }
    const now = nowIso()
    const schedule: Schedule = {
      scheduleId: newScheduleId(),
      coachId: state.coach.coachId,
      gymId: payload.gymId,
      specialtyId: payload.specialtyId,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      price: payload.price,
      status: 'AVAILABLE',
      studentId: null,
      paymentStatus: null,
      rating: null,
      studentComment: null,
      requests: null,
      createdAt: now,
      updatedAt: now,
    }
    state.schedules.set(schedule.scheduleId, schedule)
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<Schedule>(schedule, { status: 201 })
  }),

  http.post('*/coach/schedule/cancel', async ({ request }) => {
    await wait(300)
    const { scheduleId } = (await request.json()) as { scheduleId: string }
    const schedule = state.schedules.get(scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.coachId !== state.coach.coachId) {
      return HttpResponse.json({ errors: ['Sem permissão.'] }, { status: 403 })
    }
    const cancellable: ScheduleStatus[] = ['AVAILABLE', 'REQUESTED', 'BOOKED']
    if (!cancellable.includes(schedule.status)) {
      return HttpResponse.json(
        { errors: [`Não é possível cancelar um schedule com status ${schedule.status}.`] },
        { status: 422 },
      )
    }
    const now = nowIso()
    state.schedules.set(scheduleId, { ...schedule, status: 'CANCELLED', updatedAt: now })
    writeStoredSchedules(state.schedules)
    const notifiedStudents =
      schedule.status === 'BOOKED'
        ? 1
        : (schedule.requests?.filter((r) => r.status === 'REQUESTED').length ?? 0)
    return HttpResponse.json<ScheduleCancelResult>({
      message: 'Schedule cancelled successfully.',
      scheduleId,
      status: 'CANCELLED',
      notifiedStudents,
      cancelledAt: now,
    })
  }),

  http.get('*/coach/schedule/requests', async ({ request }) => {
    await wait(200)
    let body: { scheduleId?: string } = {}
    try {
      body = (await request.json()) as typeof body
    } catch {
      const url = new URL(request.url)
      const scheduleId = url.searchParams.get('scheduleId')
      body = {
        ...(scheduleId && { scheduleId }),
      }
    }
    if (!body.scheduleId) {
      return HttpResponse.json({ errors: ['scheduleId obrigatório.'] }, { status: 400 })
    }
    const schedule = state.schedules.get(body.scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.coachId !== state.coach.coachId) {
      return HttpResponse.json({ errors: ['Sem permissão.'] }, { status: 403 })
    }
    const requests = (schedule.requests ?? []).map((r) => ({
      ...r,
      studentName: lookupStudentName(r.studentId),
    }))
    return HttpResponse.json<ScheduleRequestsResponse>({
      scheduleId: schedule.scheduleId,
      startDateTime: schedule.startDateTime,
      endDateTime: schedule.endDateTime,
      status: schedule.status,
      count: requests.length,
      requests,
    })
  }),

  http.post('*/coach/schedule/approve', async ({ request }) => {
    await wait(400)
    const { scheduleId, studentId } = (await request.json()) as {
      scheduleId: string
      studentId: string
    }
    const schedule = state.schedules.get(scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.coachId !== state.coach.coachId) {
      return HttpResponse.json({ errors: ['Sem permissão.'] }, { status: 403 })
    }
    if (!schedule.requests?.some((r) => r.studentId === studentId)) {
      return HttpResponse.json({ errors: ['Solicitação não encontrada.'] }, { status: 422 })
    }
    const now = nowIso()
    const updatedRequests: ScheduleRequest[] = schedule.requests.map((r) => ({
      ...r,
      status: r.studentId === studentId ? 'APPROVED' : 'REJECTED',
      alteredAt: now,
    }))
    state.schedules.set(scheduleId, {
      ...schedule,
      status: 'BOOKED',
      studentId,
      requests: updatedRequests,
      updatedAt: now,
    })
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<ScheduleApproveResult>({
      message: 'Schedule approved successfully.',
      scheduleId,
      studentId,
      status: 'BOOKED',
      updatedAt: now,
    })
  }),

  http.post('*/coach/schedule/class/status', async ({ request }) => {
    await wait(300)
    const { scheduleId, status } = (await request.json()) as {
      scheduleId: string
      status: string
    }
    const schedule = state.schedules.get(scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.coachId !== state.coach.coachId) {
      return HttpResponse.json({ errors: ['Sem permissão.'] }, { status: 403 })
    }
    if (schedule.status !== 'BOOKED') {
      return HttpResponse.json(
        {
          errors: [
            `Só é possível atualizar status de um schedule BOOKED. Status atual: ${schedule.status}`,
          ],
        },
        { status: 422 },
      )
    }
    if (status !== 'COMPLETED' && status !== 'NOSHOW') {
      return HttpResponse.json(
        { errors: ['Status inválido. Use COMPLETED ou NOSHOW.'] },
        { status: 422 },
      )
    }
    const now = nowIso()
    state.schedules.set(scheduleId, {
      ...schedule,
      status,
      paymentStatus: 'PENDING',
      updatedAt: now,
    })
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<ClassStatusResult>({
      message: `Schedule updated to '${status}' successfully.`,
      scheduleId,
      status,
      paymentStatus: 'PENDING',
      updatedAt: now,
    })
  }),

  // ── Student — Agenda ───────────────────────────────────────────────────────

  http.get('*/student/coach/schedules', async ({ request }) => {
    await wait(200)
    let params: { coachId?: string; startDateTime?: string; endDateTime?: string } = {}
    try {
      params = (await request.json()) as typeof params
    } catch {
      const url = new URL(request.url)
      const coachId = url.searchParams.get('coachId')
      const startDateTime = url.searchParams.get('startDateTime')
      const endDateTime = url.searchParams.get('endDateTime')
      params = {
        ...(coachId && { coachId }),
        ...(startDateTime && { startDateTime }),
        ...(endDateTime && { endDateTime }),
      }
    }
    if (!params.coachId) {
      return HttpResponse.json({ errors: ['coachId obrigatório.'] }, { status: 400 })
    }
    const schedules: CoachScheduleSlot[] = [...state.schedules.values()]
      .filter((schedule) => {
        if (schedule.coachId !== params.coachId) return false
        if (params.startDateTime && schedule.startDateTime < params.startDateTime) return false
        if (params.endDateTime && schedule.endDateTime > params.endDateTime) return false
        return schedule.status === 'AVAILABLE' || schedule.status === 'REQUESTED'
      })
      .map((s) => ({
        scheduleId: s.scheduleId,
        coachId: s.coachId,
        gymId: s.gymId,
        specialtyId: s.specialtyId,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        price: s.price,
        status: s.status,
      }))
    return HttpResponse.json<StudentCoachSchedulesResponse>({
      coachId: params.coachId,
      startDateTime: params.startDateTime ?? '',
      endDateTime: params.endDateTime ?? '',
      count: schedules.length,
      schedules,
    })
  }),

  http.get('*/student/coach/schedules/request', async () => {
    await wait(200)
    const schedules: StudentScheduleItem[] = [...state.schedules.values()]
      .flatMap((schedule) => {
        const ownRequest =
          schedule.requests?.find((request) => request.studentId === state.client.clientId) ?? null
        const bookedForStudent = schedule.studentId === state.client.clientId
        if (!ownRequest && !bookedForStudent) return []

        const item: StudentScheduleItem = {
          scheduleId: schedule.scheduleId,
          coachId: schedule.coachId,
          gymId: schedule.gymId,
          specialtyId: schedule.specialtyId,
          price: schedule.price,
          startDateTime: schedule.startDateTime,
          endDateTime: schedule.endDateTime,
          scheduleStatus: schedule.status,
          paymentStatus: schedule.paymentStatus,
          request: ownRequest,
        }
        return [item]
      })
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())

    return HttpResponse.json<StudentSchedulesResponse>({
      studentId: state.client.clientId,
      count: schedules.length,
      schedules,
    })
  }),

  http.post('*/student/coach/schedules/request', async ({ request }) => {
    await wait(300)
    const { scheduleId } = (await request.json()) as { scheduleId?: string }
    if (!scheduleId) {
      return HttpResponse.json({ errors: ['scheduleId obrigatório.'] }, { status: 400 })
    }
    const schedule = state.schedules.get(scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.status !== 'AVAILABLE' && schedule.status !== 'REQUESTED') {
      return HttpResponse.json(
        { errors: [`Não é possível solicitar um schedule com status ${schedule.status}.`] },
        { status: 422 },
      )
    }
    const requestedAt = nowIso()
    const requestEntry: ScheduleRequest = {
      studentId: state.client.clientId,
      status: 'REQUESTED',
      requestedAt,
    }
    const existingRequests = schedule.requests ?? []
    if (existingRequests.some((item) => item.studentId === state.client.clientId)) {
      return HttpResponse.json({ errors: ['Você já solicitou este horário.'] }, { status: 422 })
    }
    state.schedules.set(scheduleId, {
      ...schedule,
      status: 'REQUESTED',
      requests: [...existingRequests, requestEntry],
      updatedAt: requestedAt,
    })
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<ScheduleRequestResult>({
      message: 'Schedule request submitted successfully.',
      scheduleId,
      studentId: state.client.clientId,
      status: 'REQUESTED',
      requestedAt,
    })
  }),

  http.delete('*/student/coach/schedules/request', async ({ request }) => {
    await wait(300)
    let body: { scheduleId?: string } = {}
    try {
      body = (await request.json()) as typeof body
    } catch {
      const url = new URL(request.url)
      const scheduleId = url.searchParams.get('scheduleId')
      if (scheduleId) body = { scheduleId }
    }
    if (!body.scheduleId) {
      return HttpResponse.json({ errors: ['scheduleId obrigatório.'] }, { status: 400 })
    }
    const schedule = state.schedules.get(body.scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    const existingRequests = schedule.requests ?? []
    const ownRequest = existingRequests.find((r) => r.studentId === state.client.clientId)
    if (!ownRequest) {
      return HttpResponse.json({ errors: ['Solicitação não encontrada.'] }, { status: 404 })
    }
    if (ownRequest.status !== 'REQUESTED') {
      return HttpResponse.json(
        { errors: ['Só é possível cancelar uma solicitação com status REQUESTED.'] },
        { status: 422 },
      )
    }
    const cancelledAt = nowIso()
    const updatedRequests = existingRequests.filter((r) => r.studentId !== state.client.clientId)
    const stillRequested = updatedRequests.some((r) => r.status === 'REQUESTED')
    const newStatus: ScheduleStatus = stillRequested ? 'REQUESTED' : 'AVAILABLE'
    state.schedules.set(body.scheduleId, {
      ...schedule,
      status: newStatus,
      requests: updatedRequests.length > 0 ? updatedRequests : null,
      updatedAt: cancelledAt,
    })
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<CancelRequestResult>({
      message: 'Request cancelled successfully.',
      scheduleId: body.scheduleId,
      studentId: state.client.clientId,
      scheduleStatus: newStatus,
      cancelledAt,
    })
  }),

  http.post('*/student/coach/schedules/cancel', async ({ request }) => {
    await wait(300)
    const { scheduleId } = (await request.json()) as { scheduleId?: string }
    if (!scheduleId) {
      return HttpResponse.json({ errors: ['scheduleId obrigatório.'] }, { status: 400 })
    }
    const schedule = state.schedules.get(scheduleId)
    if (!schedule) {
      return HttpResponse.json({ errors: ['Schedule não encontrado.'] }, { status: 404 })
    }
    if (schedule.studentId !== state.client.clientId) {
      return HttpResponse.json({ errors: ['Sem permissão.'] }, { status: 403 })
    }
    if (schedule.status !== 'BOOKED') {
      return HttpResponse.json(
        {
          errors: [
            `Só é possível cancelar um agendamento confirmado (BOOKED). Status atual: ${schedule.status}`,
          ],
        },
        { status: 422 },
      )
    }
    const cancelledAt = nowIso()
    state.schedules.set(scheduleId, { ...schedule, status: 'CANCELLED', updatedAt: cancelledAt })
    writeStoredSchedules(state.schedules)
    return HttpResponse.json<ScheduleCancelResult>({
      message: 'Schedule cancelled successfully.',
      scheduleId,
      status: 'CANCELLED',
      cancelledAt,
    })
  }),

  http.get('*/student/gyms/schedule', async ({ request }) => {
    await wait(200)
    let params: { gymId?: string; startDateTime?: string; endDateTime?: string } = {}
    try {
      params = (await request.json()) as typeof params
    } catch {
      const url = new URL(request.url)
      const gymId = url.searchParams.get('gymId')
      const startDateTime = url.searchParams.get('startDateTime')
      const endDateTime = url.searchParams.get('endDateTime')
      params = {
        ...(gymId ? { gymId } : {}),
        ...(startDateTime ? { startDateTime } : {}),
        ...(endDateTime ? { endDateTime } : {}),
      }
    }
    if (!params.gymId) {
      return HttpResponse.json({ errors: ['gymId obrigatório.'] }, { status: 400 })
    }
    const schedules = [...state.schedules.values()].filter((s) => {
      if (s.gymId !== params.gymId) return false
      if (!['AVAILABLE', 'REQUESTED'].includes(s.status)) return false
      if (params.startDateTime && s.startDateTime < params.startDateTime) return false
      if (params.endDateTime && s.endDateTime > params.endDateTime) return false
      return true
    })
    return HttpResponse.json({
      gymId: params.gymId,
      startDateTime: params.startDateTime ?? '',
      endDateTime: params.endDateTime ?? '',
      count: schedules.length,
      schedules,
    })
  }),

  http.get('*/student/coaches/:coachId', async ({ params }) => {
    await wait(180)
    const coachId = String(params['coachId'])
    const coach = coachDetailFixtures[coachId]
    if (!coach) {
      return HttpResponse.json({ errors: ['Treinador não encontrado.'] }, { status: 404 })
    }
    return HttpResponse.json<CoachDetail>(coach)
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

    let status: 'approved' | 'refused' = 'approved'
    let cardLastFour: string | null = null
    if (payload.method === 'credit_card' && 'card' in payload) {
      const cardNumber = payload.card.number.replace(/\s/g, '')
      if (cardNumber === '4222222222222222') status = 'refused'
      cardLastFour = cardNumber.slice(-4)
    }

    const split: { platform: number; coach: number } | null =
      status !== 'refused'
        ? {
            platform: Math.floor(payload.amount * 0.1),
            coach: Math.floor(payload.amount * 0.9),
          }
        : null

    const transaction: Transaction = {
      transactionId,
      sessionId: payload.sessionId,
      coachId: payload.coachId,
      studentId: payload.studentId,
      method: payload.method,
      amount: payload.amount,
      status,
      cardLastFour,
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
      status: 'refunded',
      cardLastFour: transaction.cardLastFour ?? null,
      split: transaction.split
        ? { platform: -transaction.split.platform, coach: -transaction.split.coach }
        : null,
      createdAt: new Date().toISOString(),
    }

    state.transactions.set(refundId, refundTxn)
    return HttpResponse.json<Transaction>(refundTxn, { status: 201 })
  }),
]
