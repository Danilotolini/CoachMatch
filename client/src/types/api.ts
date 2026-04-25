export type CoachStatus =
  | 'PROFILE_INCOMPLETE'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'

export interface CoachMe {
  email: string
  name: string | null
  phone: string | null
  instagram: string | null
  cref: string | null
  profilePhoto: string | null
  profileVideo: string | null
  specialties: string[]
  territory: 'GYMS' | 'HOME_SERVICE' | null
  gyms: string[]
  serviceRadius: number | null
  status: CoachStatus
  rejectionReason: string | null
}

export interface CoachMePayload {
  name?: string | undefined
  phone?: string | undefined
  instagram?: string | undefined
  cref?: string | undefined
  profilePhoto?: string | undefined
  profileVideo?: string | undefined
  specialties?: string[] | undefined
  territory?: 'GYMS' | 'HOME_SERVICE' | undefined
  gyms?: string[] | undefined
  serviceRadius?: number | undefined
}

export interface Specialty {
  id: string
  name: string
}

export interface Gym {
  id: string
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: { lat: number; lng: number }
}

export interface GymSuggestPayload {
  name: string
  address: string
  city: string
  state: string
  neighborhood: string
  coordinates: { lat: number; lng: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

export interface UploadUrlResponse {
  key: string
  upload: {
    url: string
    fields: Record<string, string>
  }
}
