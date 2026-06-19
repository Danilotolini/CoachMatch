import { useQuery } from '@tanstack/react-query'
import { fetchStudentSpecialties } from '@/api/specialties'
import { getToken } from '@/lib/auth'

const ONE_HOUR = 60 * 60 * 1000

export function useStudentSpecialties(search?: string) {
  return useQuery({
    queryKey: ['student-specialties', search],
    queryFn: () => fetchStudentSpecialties({ search }),
    enabled: !!getToken(),
    staleTime: ONE_HOUR,
  })
}
