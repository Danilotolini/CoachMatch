export type CoachStatus = 'ONBOARDING_PROFILE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export type CoachVisibility = 'VISIBLE' | 'INVISIBLE'

export type ClientStatus = 'ONBOARDING_PROFILE' | 'ONBOARDING_HEALTH' | 'ACTIVE'

export interface Coordinates {
  lat: number
  lng: number
}

export interface CoachProfile {
  name: string
  phone: string | null
  specialties: string[]
  cref: string
  instagram: string
  profile_video: boolean
}

export interface WorkLocationGym {
  type: 'GYM'
  gymId: string
}

export interface HomeServiceCoverage {
  city: string
  state: string
  neighborhoods: string[]
}

export interface WorkLocationHomeService {
  type: 'HOME_SERVICE'
  coverage: HomeServiceCoverage
}

export type WorkLocation = WorkLocationGym | WorkLocationHomeService

export interface Coach {
  coachId: string
  email: string
  status: CoachStatus
  visibility: CoachVisibility
  profile: CoachProfile
  work_location: WorkLocation[]
  createdAt: string
  updatedAt: string
}

export interface CoachUpdatePayload {
  profile?: Partial<CoachProfile>
  work_location?: WorkLocation[]
}

export type CoachSearchSort = 'rating' | 'price_asc' | 'price_desc'

export interface CoachListItem {
  coachId: string
  name: string
  specialties: string[]
  rating: number
  priceFrom: number
  neighborhood: string
  city: string
  nextAvailability: string
  photo: string | null
}

export interface CoachSearchFilters {
  q?: string | undefined
  specialties?: string[] | undefined
  address?: string | undefined
  priceMin?: number | undefined
  priceMax?: number | undefined
  availableOn?: string | undefined
  sort?: CoachSearchSort | undefined
  page?: number | undefined
  limit?: number | undefined
}

export type CoachSearchResponse = PaginatedResponse<CoachListItem>

export type ClientGender = 'F' | 'M' | 'NB' | 'NA'

export type ClientGoal =
  | 'WEIGHT_LOSS'
  | 'HYPERTROPHY'
  | 'CONDITIONING'
  | 'REHAB'
  | 'PERFORMANCE'

/** Respostas PAR-Q armazenadas após a etapa de saúde */
export interface ClientHealth {
  answers: Record<string, 'YES' | 'NO'>
  notes: string
  lgpdConsent: boolean
  medicalDisclaimer: boolean
}

/** Perfil completo do aluno retornado por GET/POST /clients/me */
export interface Client {
  clientId: string
  email: string
  status: ClientStatus
  name: string | null
  phone: string | null
  birthDate: string | null
  gender: ClientGender | null
  cep: string | null
  city: string | null
  state: string | null
  radius: number | null
  goal: ClientGoal | string | null
  health: ClientHealth | null
}

export interface ClientProfilePayload {
  phone: string
  birthDate: string
  gender: ClientGender
  cep: string
  city: string
  state: string
  radius: 5 | 10 | 20
  goal: ClientGoal
}

export interface ClientHealthPayload {
  answers: Record<string, 'YES' | 'NO'>
  notes: string
  lgpdConsent: boolean
  medicalDisclaimer: boolean
}

export interface Specialty {
  id: string
  label: string
}

export interface Gym {
  gymId: string
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: Coordinates
}

export interface GymSuggestPayload {
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: Coordinates
}

export interface GymSuggestResponse {
  data: Gym
  message: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface UploadUrlResponse {
  key: string
  expiresIn: number
  upload: {
    url: string
    fields: Record<string, string>
  }
}

export type PaymentStatus = 'approved' | 'refused' | 'pending'
export type PaymentMethod = 'credit_card' | 'pix'

export interface CardInfo {
  number: string
  holder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}

export interface PaymentPayload {
  sessionId: string
  method: PaymentMethod
  card?: CardInfo
  amount: number
  coachId: string
  studentId: string
}

export interface Transaction {
  transactionId: string
  sessionId: string
  coachId: string
  studentId: string
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  cardLastFour?: string
  split?: {
    platformFee: number
    coachAmount: number
  }
  createdAt: string
}
