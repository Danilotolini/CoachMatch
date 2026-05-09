export type CoachStatus =
  | 'PENDING_PROFILE'
  | 'PROFILE_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'INACTIVE'

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
  profile: CoachProfile
  work_location: WorkLocation[]
  createdAt: string
  updatedAt: string
}

export interface CoachUpdatePayload {
  profile?: Partial<CoachProfile>
  work_location?: WorkLocation[]
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
