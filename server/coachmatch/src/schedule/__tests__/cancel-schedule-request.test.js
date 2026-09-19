import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../cancel-schedule-request/handler.js';
import { cancelScheduleRequest } from '../cancel-schedule-request/index.js';
import { ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';

const STUDENT_ID = 'student-1';
const SCHEDULE_ID = 'avl_1';

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
  body: JSON.stringify(body),
});

const scheduleWith = (overrides) => ({
  scheduleId: SCHEDULE_ID, status: 'REQUESTED',
  requests: [{ studentId: STUDENT_ID, status: 'REQUESTED' }],
  ...overrides,
});

describe('cancel-schedule-request › index', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancela o request e volta pra AVAILABLE quando não há outros pendentes', async () => {
    sendMock.mockResolvedValueOnce({ Item: scheduleWith({}) }).mockResolvedValueOnce({});
    const result = await cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID);
    expect(result.scheduleStatus).toBe('AVAILABLE');
    expect(result.studentId).toBe(STUDENT_ID);
  });

  it('mantém REQUESTED quando outro aluno ainda tem request pendente', async () => {
    sendMock.mockResolvedValueOnce({
      Item: scheduleWith({ requests: [{ studentId: STUDENT_ID, status: 'REQUESTED' }, { studentId: 'other', status: 'REQUESTED' }] }),
    }).mockResolvedValueOnce({});
    const result = await cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID);
    expect(result.scheduleStatus).toBe('REQUESTED');
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleStateException quando status do schedule não é AVAILABLE/REQUESTED', async () => {
    sendMock.mockResolvedValueOnce({ Item: scheduleWith({ status: 'BOOKED' }) });
    await expect(cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });

  it('lança ScheduleNotFoundException quando o aluno não tem request neste schedule', async () => {
    sendMock.mockResolvedValueOnce({ Item: scheduleWith({ requests: [{ studentId: 'other', status: 'REQUESTED' }] }) });
    await expect(cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleStateException quando o request do aluno já não está REQUESTED', async () => {
    sendMock.mockResolvedValueOnce({ Item: scheduleWith({ requests: [{ studentId: STUDENT_ID, status: 'CANCELLED' }] }) });
    await expect(cancelScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });
});

describe('cancel-schedule-request › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 ao cancelar com sucesso', async () => {
    sendMock.mockResolvedValueOnce({ Item: scheduleWith({}) }).mockResolvedValueOnce({});
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 400 quando scheduleId ausente (antes do JWT)', async () => {
    const res = await handler({ body: JSON.stringify({}) });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID }) });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 404 quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(404);
  });
});
