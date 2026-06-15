import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveScheduleRequest,
  cancelCoachSchedule,
  getCoachSchedule,
  getCoachScheduleRequests,
  updateClassStatus,
} from '@/api/schedule'
import { getToken } from '@/lib/auth'
import type { ClassStatus, Schedule, ScheduleRequestsResponse } from '@/types/api'

export function useCoachSchedule(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['coachSchedule', startDate, endDate],
    queryFn: async () => {
      const result = await getCoachSchedule({
        startDateTime: `${startDate}T00:00:00-03:00`,
        endDateTime: `${endDate}T23:59:59-03:00`,
      })
      return result.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
    },
    enabled: !!getToken(),
  })
}

export function useCoachScheduleRequests(slots: Schedule[]) {
  const requestedSlots = slots.filter((s) => s.status === 'REQUESTED')

  return useQueries({
    queries: requestedSlots.map((slot) => ({
      queryKey: ['coachScheduleRequests', slot.scheduleId],
      queryFn: () => getCoachScheduleRequests(slot.scheduleId),
      enabled: !!getToken(),
    })),
    combine: (results): Partial<Record<string, ScheduleRequestsResponse>> => {
      const map: Partial<Record<string, ScheduleRequestsResponse>> = {}
      results.forEach((result, i) => {
        const slot = requestedSlots[i]
        if (result.data) {
          map[slot.scheduleId] = result.data
        }
      })
      return map
    },
  })
}

export function useCancelCoachSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scheduleId: string) => cancelCoachSchedule(scheduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coachSchedule'] })
    },
  })
}

export function useApproveCoachScheduleRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scheduleId, studentId }: { scheduleId: string; studentId: string }) =>
      approveScheduleRequest(scheduleId, studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coachSchedule'] })
      void queryClient.invalidateQueries({ queryKey: ['coachScheduleRequests'] })
    },
  })
}

export function useUpdateCoachClassStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ scheduleId, status }: { scheduleId: string; status: ClassStatus }) =>
      updateClassStatus(scheduleId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['coachSchedule'] })
    },
  })
}
