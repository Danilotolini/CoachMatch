import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelStudentSchedule, cancelStudentScheduleRequest } from '@/api/schedule'

const STUDENT_SCHEDULE_KEY = ['student-schedule-requests']

// Cancela apenas a solicitação do próprio aluno; o horário volta a ficar disponível.
export function useCancelStudentScheduleRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scheduleId: string) => cancelStudentScheduleRequest(scheduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STUDENT_SCHEDULE_KEY })
    },
  })
}

// Cancela uma sessão já confirmada (BOOKED) do aluno.
export function useCancelStudentSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (scheduleId: string) => cancelStudentSchedule(scheduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STUDENT_SCHEDULE_KEY })
    },
  })
}
