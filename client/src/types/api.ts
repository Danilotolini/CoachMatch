export type CoachStatus = 'PENDING_PROFILE' | 'APPROVED'

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

export interface CoachDetail extends CoachListItem {
  cref: string
  bio: string
  experienceYears: number
  sessionsCount: number
  responseTime: string
  serviceAreas: string[]
  trainingStyles: string[]
  languages: string[]
  instagram: string | null
  reviews: {
    id: string
    studentName: string
    rating: number
    comment: string
    date: string
  }[]
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

export type ClientGoal = 'WEIGHT_LOSS' | 'HYPERTROPHY' | 'CONDITIONING' | 'REHAB' | 'PERFORMANCE'

/** Respostas PAR-Q armazenadas após a etapa de saúde */
export interface ClientHealth {
  answers: Record<string, 'YES' | 'NO'>
  notes: string
  lgpdConsent: boolean
  medicalDisclaimer: boolean
}

/** Perfil completo do aluno retornado por GET /student/me */
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
  goal: ClientGoal | null
  health: ClientHealth | null
  createdAt: string
  updatedAt: string
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

// ── Schedule ──────────────────────────────────────────────────────────────────

export type ScheduleStatus =
  | 'AVAILABLE'
  | 'REQUESTED'
  | 'BOOKED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NOSHOW'

export type RequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'
export type ClassStatus = 'COMPLETED' | 'NOSHOW'

export interface ScheduleRequest {
  studentId: string
  status: RequestStatus
  requestedAt: string
  alteredAt: string | null
  studentName: string | null
}

export interface Schedule {
  scheduleId: string
  coachId: string
  gymId: string
  specialtyId: string
  startDateTime: string
  endDateTime: string
  price: string
  status: ScheduleStatus
  studentId: string | null
  paymentStatus: string | null
  rating: number | null
  studentComment: string | null
  requests: ScheduleRequest[] | null
  createdAt: string
  updatedAt: string
}

export interface ScheduleCreatePayload {
  gymId: string
  specialtyId: string
  startDateTime: string
  endDateTime: string
  price: string
}

export interface CoachScheduleResponse {
  coachId: string
  startDateTime: string
  endDateTime: string
  count: number
  schedules: Schedule[]
}

export interface ScheduleRequestsResponse {
  scheduleId: string
  startDateTime: string
  endDateTime: string
  status: ScheduleStatus
  count: number
  requests: ScheduleRequest[]
}

export interface ScheduleRequestResult {
  message: string
  scheduleId: string
  studentId: string
  status: RequestStatus
  requestedAt: string
}

export interface StudentScheduleItem {
  scheduleId: string
  coachId: string
  gymId: string
  specialtyId: string
  price: string
  startDateTime: string
  endDateTime: string
  scheduleStatus: ScheduleStatus
  paymentStatus?: string | null
  request: ScheduleRequest | null
}

export interface StudentSchedulesResponse {
  studentId: string
  count: number
  schedules: StudentScheduleItem[]
}

export interface ScheduleApproveResult {
  message: string
  scheduleId: string
  studentId: string
  status: 'BOOKED'
  updatedAt: string
}

export interface ScheduleCancelResult {
  message: string
  scheduleId: string
  status: 'CANCELLED'
  notifiedStudents?: number
  cancelledAt: string
}

export interface CancelRequestResult {
  message: string
  scheduleId: string
  studentId: string
  scheduleStatus: ScheduleStatus
  cancelledAt: string
}

export interface GymScheduleResponse {
  gymId: string
  startDateTime: string
  endDateTime: string
  count: number
  schedules: Schedule[]
}

export interface ClassStatusResult {
  message: string
  scheduleId: string
  status: ClassStatus
  paymentStatus: 'PENDING'
  updatedAt: string
}

// ── Pagamentos ────────────────────────────────────────────────────────────────

export type TransactionStatus = 'approved' | 'refused' | 'refunded'
export type PaymentMethod = 'credit_card' | 'pix'

export interface CardPaymentPayload {
  sessionId: string
  coachId: string
  studentId: string
  amount: number
  method: 'credit_card'
  card: {
    number: string
    holder: string
    expiryMonth: string
    expiryYear: string
    cvv: string
  }
}

export interface PixPaymentPayload {
  sessionId: string
  coachId: string
  studentId: string
  amount: number
  method: 'pix'
}

export type PaymentPayload = CardPaymentPayload | PixPaymentPayload

export interface PaymentSplit {
  platform: number
  coach: number
}

export interface Transaction {
  transactionId: string
  sessionId: string
  coachId: string
  studentId: string
  method: PaymentMethod
  amount: number
  status: TransactionStatus
  split?: PaymentSplit | null
  cardLastFour?: string | null
  refusalReason?: string | null
  requires3ds?: boolean | null
  pixCode?: string | null
  expiresAt?: string | null
  refundId?: string | null
  refundedAt?: string | null
  createdAt: string
}
