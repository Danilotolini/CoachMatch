import { apiGet } from '@/lib/http'
import type { PaginatedResponse, Specialty } from '@/types/api'

export interface SpecialtiesParams {
  search?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export function fetchSpecialties(params: SpecialtiesParams = {}) {
  return apiGet<PaginatedResponse<Specialty>>(
    '/coach/specialties',
    {
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { role: 'coach' },
  )
}

export function fetchStudentSpecialties(params: SpecialtiesParams = {}) {
  return apiGet<PaginatedResponse<Specialty>>(
    '/student/specialties',
    {
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { role: 'client' },
  )
}
