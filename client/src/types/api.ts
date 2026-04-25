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
