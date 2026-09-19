import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../create-schedule/handler.js';
import { createSchedule } from '../create-schedule/index.js';
import { queryCoachSchedulesForConflict, putSchedule } from '../create-schedule/repository.js';
import { ScheduleStateException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const VALID_BODY = {
  gymId: 'gym-1', price: 100, specialtyId: 'yoga',
  startDateTime: '2026-06-01T07:00:00-03:00', endDateTime: '2026-06-01T08:00:00-03:00',
};

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

describe('create-schedule › index', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cria schedule quando não há conflito e gym/specialty existem', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] }) // conflict query
      .mockResolvedValueOnce({ Item: { gymId: 'gym-1' } }) // gym exists
      .mockResolvedValueOnce({ Item: { id: 'yoga' } }) // specialty exists
      .mockResolvedValueOnce({}); // put

    const item = await createSchedule(COACH_ID, VALID_BODY);
    expect(item.scheduleId).toMatch(/^avl_[0-9a-f]{32}$/);
    expect(item.status).toBe('AVAILABLE');
    expect(item.coachId).toBe(COACH_ID);
    expect(item.studentId).toBeNull();
  });

  it('acumula múltiplos erros (gym e specialty inexistentes) em um único 422', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({}) // gym not found
      .mockResolvedValueOnce({}); // specialty not found

    await expect(createSchedule(COACH_ID, VALID_BODY)).rejects.toMatchObject({
      statusCode: 422,
      errors: [`Academia '${VALID_BODY.gymId}' não encontrada.`, `Especialidade '${VALID_BODY.specialtyId}' não encontrada.`],
    });
  });

  it('reporta conflito de horário quando há overlap com schedule existente', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [{ startDateTime: '2026-06-01T07:30:00-03:00', endDateTime: '2026-06-01T09:00:00-03:00' }] })
      .mockResolvedValueOnce({ Item: { gymId: 'gym-1' } })
      .mockResolvedValueOnce({ Item: { id: 'yoga' } });

    await expect(createSchedule(COACH_ID, VALID_BODY)).rejects.toBeInstanceOf(ScheduleStateException);
  });

  it('não reporta conflito quando os horários não se sobrepõem', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [{ startDateTime: '2026-06-01T09:00:00-03:00', endDateTime: '2026-06-01T10:00:00-03:00' }] })
      .mockResolvedValueOnce({ Item: { gymId: 'gym-1' } })
      .mockResolvedValueOnce({ Item: { id: 'yoga' } })
      .mockResolvedValueOnce({});

    const item = await createSchedule(COACH_ID, VALID_BODY);
    expect(item.status).toBe('AVAILABLE');
  });

  it('reporta erro de formato de data como parte do 422 (não 400)', async () => {
    // Data inválida pula a checagem de conflito; gym e specialty existem, então
    // o 422 sai só com o erro de formato.
    sendMock
      .mockResolvedValueOnce({ Item: { gymId: 'gym-1' } })
      .mockResolvedValueOnce({ Item: { id: 'yoga' } });

    await expect(createSchedule(COACH_ID, { ...VALID_BODY, startDateTime: 'not-a-date' }))
      .rejects.toMatchObject({ statusCode: 422 });
  });

  it('propaga falha de infraestrutura como 500, não como 422', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] })
      .mockRejectedValueOnce(new Error('ThrottlingException')) // gym
      .mockResolvedValueOnce({ Item: { id: 'yoga' } });

    await expect(createSchedule(COACH_ID, VALID_BODY)).rejects.toMatchObject({ statusCode: 500 });
  });

});

describe('create-schedule › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('limita a query de conflito à janela pedida e pagina', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [], LastEvaluatedKey: { scheduleId: 'avl_x' } })
      .mockResolvedValueOnce({ Items: [] });

    await queryCoachSchedulesForConflict(COACH_ID, VALID_BODY.endDateTime);

    const [[firstPage], [secondPage]] = sendMock.mock.calls;
    expect(firstPage.input.KeyConditionExpression).toContain('startDateTime < :end');
    expect(firstPage.input.ExpressionAttributeValues[':end']).toBe(VALID_BODY.endDateTime);
    expect(secondPage.input.ExclusiveStartKey).toEqual({ scheduleId: 'avl_x' });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('grava o schedule só como criação', async () => {
    sendMock.mockResolvedValueOnce({});

    await putSchedule({ scheduleId: 'avl_1', coachId: COACH_ID, studentId: null });

    const [[putCommand]] = sendMock.mock.calls;
    expect(putCommand.input.ConditionExpression).toBe('attribute_not_exists(scheduleId)');
    expect(putCommand.input.Item).not.toHaveProperty('studentId');
  });
});

describe('create-schedule › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 201 com o schedule criado', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Item: { gymId: 'gym-1' } })
      .mockResolvedValueOnce({ Item: { id: 'yoga' } })
      .mockResolvedValueOnce({});

    const res = await handler(buildEvent(VALID_BODY));
    expect(res.statusCode).toBe(201);
  });

  it('retorna 400 com campos obrigatórios ausentes (antes de checar JWT)', async () => {
    const res = await handler({ body: JSON.stringify({ gymId: 'gym-1' }) });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors[0]).toMatch(/Campo obrigatório ausente/);
  });

  it('retorna 400 com body JSON inválido', async () => {
    const res = await handler({ body: 'not-json' });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 quando JWT ausente (após validar campos)', async () => {
    const res = await handler({ body: JSON.stringify(VALID_BODY) });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 422 quando gym não existe', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { id: 'yoga' } });
    const res = await handler(buildEvent(VALID_BODY));
    expect(res.statusCode).toBe(422);
  });
});
