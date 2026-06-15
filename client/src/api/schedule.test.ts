import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveScheduleRequest,
  cancelCoachSchedule,
  cancelStudentScheduleRequest,
  createSchedule,
  getCoachSchedule,
  getCoachScheduleRequests,
  getStudentScheduleRequests,
  requestStudentSchedule,
  updateClassStatus,
} from './schedule'
import { apiPost } from '@/lib/http'

describe('schedule API com MSW', () => {
  beforeEach(async () => {
    await apiPost('/dev/reset')
  })

  it('GET /coach/schedule envia body e filtra por intervalo', async () => {
    const result = await getCoachSchedule({
      startDateTime: '2026-06-16T00:00:00-03:00',
      endDateTime: '2026-06-16T23:59:59-03:00',
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.scheduleId).toBe('avl_0001')
  })

  it('POST /coach/schedule retorna 201 com slot criado', async () => {
    const created = await createSchedule({
      gymId: 'gym_smartfit_paulista',
      specialtyId: 'MUSCULATION',
      startDateTime: '2026-06-20T07:00:00-03:00',
      endDateTime: '2026-06-20T08:00:00-03:00',
      price: '120.00',
    })

    expect(created.scheduleId).toMatch(/^avl_/)
    expect(created.status).toBe('AVAILABLE')
  })

  it('POST /coach/schedule trata 422 de conflito', async () => {
    await expect(
      createSchedule({
        gymId: 'gym_smartfit_paulista',
        specialtyId: 'MUSCULATION',
        startDateTime: '2026-06-16T07:30:00-03:00',
        endDateTime: '2026-06-16T08:30:00-03:00',
        price: '120.00',
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('GET /coach/schedule/requests retorna studentName', async () => {
    const result = await getCoachScheduleRequests('avl_0002')

    expect(result.count).toBe(2)
    expect(result.requests.map((request) => request.studentName)).toEqual([
      'Ana Ferreira',
      'Bruno Oliveira',
    ])
  })

  it('POST /coach/schedule/approve aprova uma solicitação', async () => {
    const result = await approveScheduleRequest('avl_0002', 'student_001')

    expect(result.status).toBe('BOOKED')
    expect(result.studentId).toBe('student_001')
  })

  it('POST /coach/schedule/approve retorna 422 para aluno inexistente', async () => {
    await expect(approveScheduleRequest('avl_0002', 'student_missing')).rejects.toMatchObject({
      status: 422,
    })
  })

  it('POST /coach/schedule/cancel retorna 422 para slot completed', async () => {
    await expect(cancelCoachSchedule('avl_0005')).rejects.toMatchObject({ status: 422 })
  })

  it('POST /coach/schedule/class/status retorna paymentStatus PENDING', async () => {
    const result = await updateClassStatus('avl_0004', 'COMPLETED')

    expect(result.status).toBe('COMPLETED')
    expect(result.paymentStatus).toBe('PENDING')
  })

  it('GET /student/coach/schedules/request lista pedido do aluno autenticado', async () => {
    await requestStudentSchedule('avl_marcos_001')

    const result = await getStudentScheduleRequests()

    expect(result.schedules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scheduleId: 'avl_marcos_payment_001',
          scheduleStatus: 'COMPLETED',
          paymentStatus: 'PENDING',
        }),
      ]),
    )
    expect(result.schedules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scheduleId: 'avl_marcos_001',
          coachId: 'coach_marcos',
          scheduleStatus: 'REQUESTED',
          request: expect.objectContaining({
            status: 'REQUESTED',
          }),
        }),
      ]),
    )
  })

  it('DELETE /student/coach/schedules/request cancela solicitação pendente', async () => {
    await requestStudentSchedule('avl_marcos_001')

    const result = await cancelStudentScheduleRequest('avl_marcos_001')

    expect(result.scheduleStatus).toBe('AVAILABLE')
    expect(result.scheduleId).toBe('avl_marcos_001')

    const schedules = await getStudentScheduleRequests()
    const cancelled = schedules.schedules.find((s) => s.scheduleId === 'avl_marcos_001')
    expect(cancelled).toBeUndefined()
  })
})
