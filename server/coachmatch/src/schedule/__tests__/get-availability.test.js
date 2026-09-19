import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { coach, gym } from '../get-availability/handler.js';
import { getAvailability, COACH_AVAILABILITY, GYM_AVAILABILITY } from '../get-availability/index.js';
import { queryAvailability } from '../get-availability/repository.js';
import { BadRequestException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const GYM_ID = 'gym-1';
const WINDOW = { startDateTime: '2026-05-25T00:00:00-03:00', endDateTime: '2026-05-26T00:00:00-03:00' };
const RAW_ITEM = {
  scheduleId: 'avl_1', coachId: COACH_ID, gymId: GYM_ID, price: 100, specialtyId: 'yoga',
  startDateTime: '2026-05-25T07:00:00-03:00', endDateTime: '2026-05-25T08:00:00-03:00', status: 'AVAILABLE',
  requests: null, studentId: null,
};

describe('get-availability › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta a GSI Coach_Date por coachId + startDateTime, filtrando AVAILABLE/REQUESTED', async () => {
    sendMock.mockResolvedValue({ Items: [RAW_ITEM] });
    await queryAvailability({ ...COACH_AVAILABILITY, keyValue: COACH_ID, ...WINDOW });
    const [[command]] = sendMock.mock.calls;
    expect(command.input.IndexName).toBe('Coach_Date');
    expect(command.input.KeyConditionExpression).toBe('coachId = :coachId AND startDateTime BETWEEN :start AND :end');
    expect(command.input.FilterExpression).toBe('#st IN (:available, :requested)');
    expect(command.input.ExpressionAttributeValues[':coachId']).toBe(COACH_ID);
  });

  it('consulta a GSI Gym_Date por gymId + startDateTime', async () => {
    sendMock.mockResolvedValue({ Items: [RAW_ITEM] });
    await queryAvailability({ ...GYM_AVAILABILITY, keyValue: GYM_ID, ...WINDOW });
    const [[command]] = sendMock.mock.calls;
    expect(command.input.IndexName).toBe('Gym_Date');
    expect(command.input.KeyConditionExpression).toBe('gymId = :gymId AND startDateTime BETWEEN :start AND :end');
    expect(command.input.ExpressionAttributeValues[':gymId']).toBe(GYM_ID);
  });
});

describe('get-availability › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: [RAW_ITEM] });
  });

  it('projeta apenas os campos públicos', async () => {
    const result = await getAvailability(COACH_AVAILABILITY, { coachId: COACH_ID, ...WINDOW });
    expect(result.schedules[0]).toEqual({
      scheduleId: 'avl_1', coachId: COACH_ID, gymId: GYM_ID, price: 100, specialtyId: 'yoga',
      startDateTime: '2026-05-25T07:00:00-03:00', endDateTime: '2026-05-25T08:00:00-03:00', status: 'AVAILABLE',
    });
    expect(result.schedules[0]).not.toHaveProperty('requests');
    expect(result.schedules[0]).not.toHaveProperty('studentId');
  });

  it('ecoa a chave consultada no corpo da resposta', async () => {
    const result = await getAvailability(GYM_AVAILABILITY, { gymId: GYM_ID, ...WINDOW });
    expect(result).toMatchObject({ gymId: GYM_ID, ...WINDOW, count: 1 });
    expect(result).not.toHaveProperty('coachId');
  });

  it('lança BadRequestException quando a chave da rota está ausente', async () => {
    await expect(getAvailability(COACH_AVAILABILITY, WINDOW)).rejects.toThrow(BadRequestException);
    await expect(getAvailability(GYM_AVAILABILITY, WINDOW)).rejects.toThrow(BadRequestException);
  });
});

describe('get-availability › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ Items: [RAW_ITEM] });
  });

  it('retorna 200 sem exigir autenticação', async () => {
    expect((await coach({ queryStringParameters: { coachId: COACH_ID, ...WINDOW } })).statusCode).toBe(200);
    expect((await gym({ queryStringParameters: { gymId: GYM_ID, ...WINDOW } })).statusCode).toBe(200);
  });

  it('retorna 400 com parâmetros ausentes', async () => {
    expect((await coach({ queryStringParameters: {} })).statusCode).toBe(400);
    expect((await gym({ queryStringParameters: {} })).statusCode).toBe(400);
  });
});
