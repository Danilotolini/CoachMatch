import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
const { notifyByEmailMock } = vi.hoisted(() => ({ notifyByEmailMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));
vi.mock('../shared/notify.js', () => ({
  notifyByEmail: notifyByEmailMock,
}));

import { handler } from '../cancel-booked-schedule/handler.js';
import { cancelBookedSchedule } from '../cancel-booked-schedule/index.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';

const STUDENT_ID = 'student-1';
const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';

const FAR_FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const NEAR_FUTURE = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
  body: JSON.stringify(body),
});

const bookedSchedule = (overrides = {}) => ({
  scheduleId: SCHEDULE_ID, coachId: COACH_ID, studentId: STUDENT_ID, status: 'BOOKED', startDateTime: FAR_FUTURE, ...overrides,
});

describe('cancel-booked-schedule › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('cancela e notifica o coach quando ele tem e-mail', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: bookedSchedule() }) // get schedule
      .mockResolvedValueOnce({}) // update
      .mockResolvedValueOnce({ Item: { email: 'coach@teste.com', name: 'Coach Fulano' } }) // coach
      .mockResolvedValueOnce({ Item: { name: 'Aluno Fulano' } }); // student

    const result = await cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID);
    expect(result.status).toBe('CANCELLED');
    expect(notifyByEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'coach@teste.com', subject: 'Aula cancelada pelo aluno' }));
  });

  it('não notifica quando o coach não tem e-mail cadastrado', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: bookedSchedule() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: {} })
      .mockResolvedValueOnce({ Item: {} });

    await cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID);
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleStateException quando status não é BOOKED (antes de checar ownership)', async () => {
    sendMock.mockResolvedValueOnce({ Item: bookedSchedule({ status: 'AVAILABLE', studentId: 'outro-aluno' }) });
    await expect(cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });

  it('lança ScheduleForbiddenException quando o aluno não é o dono da reserva', async () => {
    sendMock.mockResolvedValueOnce({ Item: bookedSchedule({ studentId: 'outro-aluno' }) });
    await expect(cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleForbiddenException);
  });

  it('lança ScheduleStateException quando faltam menos de 6h pro início', async () => {
    sendMock.mockResolvedValueOnce({ Item: bookedSchedule({ startDateTime: NEAR_FUTURE }) });
    await expect(cancelBookedSchedule(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });
});

describe('cancel-booked-schedule › handler', () => {
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
      .mockResolvedValueOnce({ Item: bookedSchedule() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: {} })
      .mockResolvedValueOnce({ Item: {} });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 422 quando falta menos de 6h', async () => {
    sendMock.mockResolvedValueOnce({ Item: bookedSchedule({ startDateTime: NEAR_FUTURE }) });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(422);
  });

  // `NaN <= deadline` é false: sem a checagem explícita a janela de 6h seria
  // pulada e o cancelamento passaria.
  it.each([
    ['data ilegível', 'not-a-date'],
    ['startDateTime ausente', undefined],
  ])('retorna 422 sem cancelar quando o schedule tem %s', async (_label, startDateTime) => {
    sendMock.mockResolvedValueOnce({ Item: bookedSchedule({ startDateTime }) });

    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));

    expect(res.statusCode).toBe(422);
    // Só o GetCommand: nada foi gravado.
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
