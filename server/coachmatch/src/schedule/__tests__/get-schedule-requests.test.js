import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../get-schedule-requests/handler.js';
import { getScheduleRequests } from '../get-schedule-requests/index.js';
import { BadRequestException, ScheduleForbiddenException, ScheduleNotFoundException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';

const buildEvent = (qs) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  queryStringParameters: qs,
});

const SCHEDULE_WITH_REQUESTS = {
  scheduleId: SCHEDULE_ID, coachId: COACH_ID, startDateTime: '2026-05-25T07:00:00-03:00', endDateTime: '2026-05-25T08:00:00-03:00',
  status: 'REQUESTED',
  requests: [{ studentId: 'student-1', status: 'REQUESTED', requestedAt: '2026-05-20T10:00:00-03:00' }],
};

describe('get-schedule-requests › index', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna count 0 e requests vazio (sem startDateTime/endDateTime/status) quando não há requests', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, requests: [] } });
    const result = await getScheduleRequests(COACH_ID, { scheduleId: SCHEDULE_ID });
    expect(result).toEqual({ scheduleId: SCHEDULE_ID, count: 0, requests: [] });
  });

  it('enriquece requests com studentName via batch get', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({ Responses: { student: [{ studentId: 'student-1', profile: { name: 'Ana' } }] } });

    const result = await getScheduleRequests(COACH_ID, { scheduleId: SCHEDULE_ID });
    expect(result.requests[0].studentName).toBe('Ana');
    expect(result.status).toBe('REQUESTED');
  });

  it('studentName é null quando o aluno não é encontrado no batch get', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({ Responses: { student: [] } });

    const result = await getScheduleRequests(COACH_ID, { scheduleId: SCHEDULE_ID });
    expect(result.requests[0].studentName).toBeNull();
  });

  it('lança BadRequestException quando scheduleId ausente', async () => {
    await expect(getScheduleRequests(COACH_ID, {})).rejects.toThrow(BadRequestException);
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(getScheduleRequests(COACH_ID, { scheduleId: SCHEDULE_ID })).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleForbiddenException quando coachId não bate', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, coachId: 'other-coach' } });
    await expect(getScheduleRequests(COACH_ID, { scheduleId: SCHEDULE_ID })).rejects.toThrow(ScheduleForbiddenException);
  });
});

describe('get-schedule-requests › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com requests enriquecidos', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({ Responses: { student: [{ studentId: 'student-1', profile: { name: 'Ana' } }] } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({ queryStringParameters: { scheduleId: SCHEDULE_ID } });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 404 quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(404);
  });

  it('retorna 403 quando coachId não é dono do schedule', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, coachId: 'other-coach' } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(403);
  });
});
