import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
const { notifyByEmailMock } = vi.hoisted(() => ({ notifyByEmailMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));
vi.mock('../shared/notify.js', () => ({
  notifyByEmail: notifyByEmailMock,
}));

import { handler } from '../cancel-schedule/handler.js';
import { cancelSchedule } from '../cancel-schedule/index.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

describe('cancel-schedule › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('cancela BOOKED e notifica só o aluno reservado', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: { scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'BOOKED', studentId: 'student-1', startDateTime: '2026-06-01T07:00:00-03:00' } })
      .mockResolvedValueOnce({}) // update
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } }) // coach name
      .mockResolvedValueOnce({ Responses: { student: [{ studentId: 'student-1', email: 'a@teste.com' }] } });

    const result = await cancelSchedule(COACH_ID, SCHEDULE_ID);
    expect(result.notifiedStudents).toBe(1);
    expect(notifyByEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@teste.com', subject: 'Aula cancelada pelo Coach' }));
  });

  it('cancela AVAILABLE/REQUESTED e notifica só quem tem request REQUESTED', async () => {
    sendMock
      .mockResolvedValueOnce({
        Item: {
          scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'REQUESTED', startDateTime: '2026-06-01T07:00:00-03:00',
          requests: [{ studentId: 'student-1', status: 'REQUESTED' }, { studentId: 'student-2', status: 'CANCELLED' }],
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } })
      .mockResolvedValueOnce({ Responses: { student: [{ studentId: 'student-1', email: 'a@teste.com' }] } });

    const result = await cancelSchedule(COACH_ID, SCHEDULE_ID);
    expect(result.notifiedStudents).toBe(1);
    expect(notifyByEmailMock).toHaveBeenCalledTimes(1);
  });

  it('notifiedStudents é 0 quando não há ninguém pra notificar', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: { scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'AVAILABLE', startDateTime: '2026-06-01T07:00:00-03:00' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } });

    const result = await cancelSchedule(COACH_ID, SCHEDULE_ID);
    expect(result.notifiedStudents).toBe(0);
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(cancelSchedule(COACH_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleForbiddenException quando coachId não bate', async () => {
    sendMock.mockResolvedValueOnce({ Item: { scheduleId: SCHEDULE_ID, coachId: 'other', status: 'AVAILABLE' } });
    await expect(cancelSchedule(COACH_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleForbiddenException);
  });

  it('lança ScheduleStateException quando status já é CANCELLED', async () => {
    sendMock.mockResolvedValueOnce({ Item: { scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'CANCELLED' } });
    await expect(cancelSchedule(COACH_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });
});

describe('cancel-schedule › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('retorna 400 sem scheduleId (antes do JWT)', async () => {
    const res = await handler({ body: JSON.stringify({}) });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID }) });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 200 com sucesso', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: { scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'AVAILABLE', startDateTime: '2026-06-01T07:00:00-03:00' } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(200);
  });
});
