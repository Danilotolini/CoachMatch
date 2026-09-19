import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../get-own-schedule/handler.js';
import { getOwnSchedule } from '../get-own-schedule/index.js';
import { queryCoachSchedule } from '../get-own-schedule/repository.js';
import { BadRequestException, ScheduleInternalException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const buildEvent = (qs) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  queryStringParameters: qs,
});

const SCHEDULE_ITEM = {
  scheduleId: 'avl_1', coachId: COACH_ID, gymId: 'gym-1', startDateTime: '2026-05-25T07:00:00-03:00',
  endDateTime: '2026-05-25T08:00:00-03:00', status: 'AVAILABLE',
};

describe('get-own-schedule › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta a GSI Coach_Date com o range informado', async () => {
    sendMock.mockResolvedValue({ Items: [SCHEDULE_ITEM] });
    const items = await queryCoachSchedule({ coachId: COACH_ID, startDateTime: 'a', endDateTime: 'b' });
    expect(items).toEqual([SCHEDULE_ITEM]);
    const [[command]] = sendMock.mock.calls;
    expect(command.input.IndexName).toBe('Coach_Date');
    expect(command.input.ExpressionAttributeValues).toEqual({ ':coachId': COACH_ID, ':start': 'a', ':end': 'b' });
  });

  it('lança ScheduleInternalException em falha do DynamoDB', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    await expect(queryCoachSchedule({ coachId: COACH_ID, startDateTime: 'a', endDateTime: 'b' }))
      .rejects.toThrow(ScheduleInternalException);
  });
});

describe('get-own-schedule › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: [SCHEDULE_ITEM] });
  });

  it('retorna schedules completos com count', async () => {
    const result = await getOwnSchedule(COACH_ID, {
      startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00',
    });
    expect(result).toEqual({
      coachId: COACH_ID, startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00',
      count: 1, schedules: [SCHEDULE_ITEM],
    });
  });

  it('lança BadRequestException quando startDateTime está ausente', async () => {
    await expect(getOwnSchedule(COACH_ID, { endDateTime: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('lança BadRequestException para formato de data inválido', async () => {
    await expect(getOwnSchedule(COACH_ID, { startDateTime: 'not-a-date', endDateTime: 'not-a-date' }))
      .rejects.toThrow(BadRequestException);
  });
});

describe('get-own-schedule › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: [SCHEDULE_ITEM] });
  });

  it('retorna 200 com a agenda do coach', async () => {
    const res = await handler(buildEvent({ startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00' }));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).count).toBe(1);
  });

  it('retorna 400 com campos obrigatórios ausentes', async () => {
    const res = await handler(buildEvent({}));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors[0]).toMatch(/Campo obrigatório ausente/);
  });

  it('retorna 401 quando não há sub no JWT', async () => {
    const res = await handler({ queryStringParameters: {} });
    expect(res.statusCode).toBe(401);
  });

  // Paridade com get-coach-schedule-from-jwt.py, que mantinha o body JSON como
  // fallback para clientes que mandam corpo em GET (Postman).
  it('lê os parâmetros do body quando não há query string', async () => {
    sendMock.mockResolvedValue({ Items: [SCHEDULE_ITEM] });

    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
      body: JSON.stringify({ startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00' }),
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).count).toBe(1);
  });

  it('retorna 400 quando o body de fallback não é JSON válido', async () => {
    const res = await handler({
      requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
      body: '{nao-e-json',
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors).toEqual(['Corpo da requisição não é um JSON válido.']);
  });

  it('retorna 500 em falha do DynamoDB', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    const res = await handler(buildEvent({ startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00' }));
    expect(res.statusCode).toBe(500);
  });
});
