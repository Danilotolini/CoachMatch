import { apiDelete, apiGetWithBody, apiPost } from '@/lib/http'
import type {
  CancelRequestResult,
  ClassStatus,
  ClassStatusResult,
  CoachScheduleResponse,
  Schedule,
  ScheduleApproveResult,
  ScheduleCancelResult,
  ScheduleCreatePayload,
  ScheduleRequestResult,
  ScheduleRequestsResponse,
  StudentSchedulesResponse,
} from '@/types/api'

export function createSchedule(payload: ScheduleCreatePayload): Promise<Schedule> {
  return apiPost<Schedule>('/coach/schedule', payload, { role: 'coach' })
}

export function getCoachSchedule(params?: {
  startDateTime?: string
  endDateTime?: string
}): Promise<Schedule[]> {
  return apiGetWithBody<CoachScheduleResponse | Schedule[]>('/coach/schedule', params, {
    role: 'coach',
  }).then((response) => (Array.isArray(response) ? response : response.schedules))
}

export function getStudentCoachSchedules(params: {
  coachId: string
  startDateTime?: string
  endDateTime?: string
}): Promise<Schedule[]> {
  return apiGetWithBody<Schedule[]>('/student/coach/schedules', params, { role: 'client' })
}

export function requestStudentSchedule(scheduleId: string): Promise<ScheduleRequestResult> {
  return apiPost<ScheduleRequestResult>(
    '/student/coach/schedules/request',
    { scheduleId },
    { role: 'client' },
  )
}

export function getStudentScheduleRequests(): Promise<StudentSchedulesResponse> {
  return apiGetWithBody<StudentSchedulesResponse>('/student/coach/schedules/request', undefined, {
    role: 'client',
  })
}

export function cancelStudentScheduleRequest(scheduleId: string): Promise<CancelRequestResult> {
  return apiDelete<CancelRequestResult>(
    '/student/coach/schedules/request',
    { scheduleId },
    { role: 'client' },
  )
}

export function cancelStudentSchedule(scheduleId: string): Promise<ScheduleCancelResult> {
  return apiPost<ScheduleCancelResult>(
    '/student/coach/schedules/cancel',
    { scheduleId },
    { role: 'client' },
  )
}

export function cancelCoachSchedule(scheduleId: string): Promise<ScheduleCancelResult> {
  return apiPost<ScheduleCancelResult>('/coach/schedule/cancel', { scheduleId }, { role: 'coach' })
}

export function getCoachScheduleRequests(scheduleId: string): Promise<ScheduleRequestsResponse> {
  return apiGetWithBody<ScheduleRequestsResponse>(
    '/coach/schedule/requests',
    { scheduleId },
    { role: 'coach' },
  )
}

export function approveScheduleRequest(
  scheduleId: string,
  studentId: string,
): Promise<ScheduleApproveResult> {
  return apiPost<ScheduleApproveResult>(
    '/coach/schedule/approve',
    { scheduleId, studentId },
    { role: 'coach' },
  )
}

export function updateClassStatus(
  scheduleId: string,
  status: ClassStatus,
): Promise<ClassStatusResult> {
  return apiPost<ClassStatusResult>(
    '/coach/schedule/class/status',
    { scheduleId, status },
    { role: 'coach' },
  )
}
