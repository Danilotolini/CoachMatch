import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../update-class-status/handler.js';
import { updateClassStatus } from '../update-class-status/index.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

const BOOKED_SCHEDULE = { scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'BOOKED' };

describe('update-class-status › index', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['COMPLETED', 'NOSHOW'])('atualiza o status para %s e paymentStatus para PENDING', async (status) => {
    sendMock.mockResolvedValueOnce({ Item: BOOKED_SCHEDULE }).mockResolvedValueOnce({});
    const result = await updateClassStatus(COACH_ID, SCHEDULE_ID, status);
    expect(result.status).toBe(status);
    expect(result.paymentStatus).toBe('PENDING');
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED')).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleForbiddenException quando coachId não bate', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...BOOKED_SCHEDULE, coachId: 'other' } });
    await expect(updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED')).rejects.toThrow(ScheduleForbiddenException);
  });

  it('lança ScheduleStateException quando status atual não é BOOKED', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...BOOKED_SCHEDULE, status: 'AVAILABLE' } });
    await expect(updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED')).rejects.toThrow(ScheduleStateException);
  });

  it('mapeia ConditionalCheckFailedException do update para 404', async () => {
    sendMock.mockResolvedValueOnce({ Item: BOOKED_SCHEDULE });
    // Falha nas duas tentativas: a guardada por paymentStatus e o fallback só de status.
    sendMock.mockRejectedValue(Object.assign(new Error('cond failed'), { name: 'ConditionalCheckFailedException' }));
    await expect(updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED')).rejects.toThrow(ScheduleNotFoundException);
  });

  it('não sobrescreve um pagamento já confirmado', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: { ...BOOKED_SCHEDULE, paymentStatus: 'PAID', paymentTransactionId: 'txn_1' } })
      .mockResolvedValueOnce({});

    const result = await updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED');

    expect(result.paymentStatus).toBe('PAID');
    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.UpdateExpression).not.toContain('paymentStatus');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('preserva o PAID que chega entre a leitura e a escrita', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: BOOKED_SCHEDULE }) // lido como PENDING
      .mockRejectedValueOnce(Object.assign(new Error('cond failed'), {
        name: 'ConditionalCheckFailedException',
      })) // pagamento confirmou no meio do caminho
      .mockResolvedValueOnce({}); // regrava só o status

    const result = await updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED');

    expect(result.status).toBe('COMPLETED');
    expect(result.paymentStatus).toBe('PAID');
    const retry = sendMock.mock.calls.at(-1)[0];
    expect(retry.input.UpdateExpression).not.toContain('paymentStatus');
  });

  it('guarda a escrita de PENDING contra um PAID existente', async () => {
    sendMock.mockResolvedValueOnce({ Item: BOOKED_SCHEDULE }).mockResolvedValueOnce({});

    await updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED');

    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.ConditionExpression).toContain('paymentStatus <> :paid');
  });

  it('amarra as duas escritas ao BOOKED que foi lido', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: BOOKED_SCHEDULE })
      .mockRejectedValueOnce(Object.assign(new Error('cond failed'), { name: 'ConditionalCheckFailedException' }))
      .mockResolvedValueOnce({});

    await updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED');

    const [, [guarded], [fallback]] = sendMock.mock.calls;
    for (const command of [guarded, fallback]) {
      expect(command.input.ConditionExpression).toContain('#st = :expectedStatus');
      expect(command.input.ExpressionAttributeValues[':expectedStatus']).toBe('BOOKED');
    }
  });

  // Sem a guarda de status, um cancelamento do aluno entre a leitura e a escrita
  // seria sobrescrito: aula COMPLETED e repasse PENDING para o coach.
  it('devolve 409 quando o schedule sai de BOOKED entre a leitura e a escrita', async () => {
    const conflict = Object.assign(new Error('cond failed'), {
      name: 'ConditionalCheckFailedException',
      Item: { ...BOOKED_SCHEDULE, status: 'CANCELLED' },
    });
    sendMock.mockResolvedValueOnce({ Item: BOOKED_SCHEDULE }).mockRejectedValue(conflict);

    await expect(updateClassStatus(COACH_ID, SCHEDULE_ID, 'COMPLETED'))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('update-class-status › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 para COMPLETED', async () => {
    sendMock.mockResolvedValueOnce({ Item: BOOKED_SCHEDULE }).mockResolvedValueOnce({});
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID, status: 'COMPLETED' }));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 400 acumulando ambos os campos ausentes', async () => {
    const res = await handler(buildEvent({}));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors).toEqual([
      "Campo obrigatório ausente: 'scheduleId'.",
      "Campo obrigatório ausente: 'status'.",
    ]);
  });

  it('retorna 400 para status inválido', async () => {
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID, status: 'BOGUS' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).errors[0]).toMatch(/'status' inválido: recebido 'BOGUS'/);
  });

  it('retorna 401 sem JWT (após validar campos)', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID, status: 'COMPLETED' }) });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 403 quando coach não é dono do schedule', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...BOOKED_SCHEDULE, coachId: 'other' } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID, status: 'COMPLETED' }));
    expect(res.statusCode).toBe(403);
  });

  it('retorna 422 quando status atual não é BOOKED', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...BOOKED_SCHEDULE, status: 'CANCELLED' } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID, status: 'COMPLETED' }));
    expect(res.statusCode).toBe(422);
  });
});
