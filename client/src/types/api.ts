export type CoachStatus = 'PENDING_PROFILE' | 'APPROVED'

export type CoachVisibility = 'VISIBLE' | 'INVISIBLE'

export type ClientStatus = 'PENDING_PROFILE' | 'ONBOARDING_HEALTH' | 'ACTIVE'

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
  /** URLs assinadas de leitura (bucket privado). null quando não há mídia. */
  photo_url: string | null
  video_url: string | null
}

export interface WorkLocationGym {
  type: 'GYM'
  gymId: string
}

export type WorkLocation = WorkLocationGym

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

/**
 * Perfil enviado em PUT /coach/me. Diferente de `CoachProfile` (leitura): aqui as
 * mídias são as KEYS do S3 (`photo_key`/`video_key`) retornadas pelo upload — o GET
 * é que assina e devolve `photo_url`/`video_url`. Omitir a key mantém a mídia atual;
 * enviar null/'' a remove.
 */
export interface CoachProfileUpdate {
  name: string
  phone: string | null
  specialties: string[]
  cref: string
  instagram: string
  photo_key?: string | null
  video_key?: string | null
}

export interface CoachUpdatePayload {
  profile?: CoachProfileUpdate
  work_location?: WorkLocation[]
}

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

export interface CoachDetailGym {
  name: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export interface CoachDetailGymLocation {
  type: 'GYM'
  gymId: string | null
  gym: CoachDetailGym | null
}

export type CoachDetailWorkLocation = CoachDetailGymLocation | CoachSummaryHomeLocation

export interface CoachDetail {
  coachId: string
  status: CoachStatus
  profile: CoachSummaryProfile
  work_location: CoachDetailWorkLocation[]
}

export interface CoachSummaryProfile {
  name: string
  phone: string | null
  specialties: string[]
  cref: string | null
  instagram: string | null
  photo_url: string | null
  video_url: string | null
}

export interface CoachSummaryGymLocation {
  type: 'GYM'
  gymId: string | null
}

export interface CoachSummaryHomeLocation {
  type: 'HOME_SERVICE'
  coverage: {
    city: string | null
    state: string | null
    neighborhoods: string[]
  }
}

export type CoachSummaryWorkLocation = CoachSummaryGymLocation | CoachSummaryHomeLocation

export interface CoachSummary {
  coachId: string
  profile: CoachSummaryProfile
  work_location: CoachSummaryWorkLocation[]
}

export interface CoachSearchCursor {
  coachId: string
}

export interface CoachSearchFilters {
  q?: string | undefined
  specialties?: string[] | undefined
  limit?: number | undefined
  lastKey?: CoachSearchCursor | null | undefined
}

export interface CoachSearchMeta {
  limit: number
  lastKey: CoachSearchCursor | null
}

export interface CoachSearchResponse {
  data: CoachSummary[]
  meta: CoachSearchMeta
}

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
  /** URL assinada de leitura da foto de perfil. null quando não há foto. */
  photo_url: string | null
  createdAt: string
  updatedAt: string
}

/** Recorte de um aluno visível ao treinador */
export interface CoachStudentDetail {
  studentId: string
  name: string | null
  birthDate: string | null
  gender: ClientGender | null
  goal: ClientGoal | null
  health: ClientHealth | null
}

export interface ClientProfilePayload {
  name: string
  phone: string
  birthDate: string
  gender: ClientGender
  cep: string
  city: string
  state: string
  radius: 5 | 10 | 20
  goal: ClientGoal
  /** Key do S3 da foto (do upload). Omitir mantém a atual; null/'' remove. */
  photo_key?: string | null
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
  coordinates: Coordinates | null
}

export interface GymSuggestPayload {
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: null
}

export interface GymSuggestResponse {
  data?: Gym | undefined
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
  alteredAt?: string | null
  studentName?: string | null
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

export interface CoachScheduleSlot {
  scheduleId: string
  coachId: string
  gymId: string
  specialtyId: string
  startDateTime: string
  endDateTime: string
  price: string
  status: ScheduleStatus
}

export interface StudentCoachSchedulesResponse {
  coachId: string
  startDateTime: string
  endDateTime: string
  count: number
  schedules: CoachScheduleSlot[]
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

// ── Chat (mensageria 1:1 aluno↔coach) ───────────────────────────────
export interface ChatConversationLastMessage {
  id: string
  text: string
  userId: string
}

export interface ChatConversation {
  id: string
  name: string | null
  members: string[]
  frozen: boolean
  lastMessageAt?: string | null
  /** Foto do par (URL assinada), resolvida pelo backend a cada leitura. */
  image?: string | null
  lastMessage?: ChatConversationLastMessage | null
}

export interface ChatMessage {
  id: string
  text: string
  userId: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface ChatHidden {
  id: string
  hidden: boolean
}

export interface ChatToken {
  apiKey: string
  userId: string
  token: string
  expiresAt: string | null
}
