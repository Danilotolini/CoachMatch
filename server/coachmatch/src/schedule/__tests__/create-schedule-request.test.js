import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
const { notifyByEmailMock } = vi.hoisted(() => ({ notifyByEmailMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));
vi.mock('../shared/notify.js', () => ({
  notifyByEmail: notifyByEmailMock,
}));

import { handler } from '../create-schedule-request/handler.js';
import { createScheduleRequest } from '../create-schedule-request/index.js';
import { ScheduleNotFoundException, ScheduleStateException, ScheduleInternalException } from '../shared/exceptions.js';

const STUDENT_ID = 'student-1';
const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } },
  body: JSON.stringify(body),
});

const AVAILABLE_SCHEDULE = {
  scheduleId: SCHEDULE_ID, coachId: COACH_ID, status: 'AVAILABLE',
  startDateTime: '2026-06-01T07:00:00-03:00', requests: null,
};

describe('create-schedule-request › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('cria o request, marca schedule REQUESTED e notifica o coach', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE }) // get schedule
      .mockResolvedValueOnce({}) // update
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } }); // get coach

    const result = await createScheduleRequest(STUDENT_ID, SCHEDULE_ID);
    expect(result.status).toBe('REQUESTED');
    expect(notifyByEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'coach@teste.com' }));
  });

  it('remove request antigo do mesmo aluno antes de adicionar o novo', async () => {
    const scheduleWithOldRequest = {
      ...AVAILABLE_SCHEDULE, status: 'REQUESTED',
      requests: [{ studentId: STUDENT_ID, status: 'CANCELLED', requestedAt: '2026-01-01T00:00:00-03:00' }],
    };
    sendMock
      .mockResolvedValueOnce({ Item: scheduleWithOldRequest })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } });

    await createScheduleRequest(STUDENT_ID, SCHEDULE_ID);
    const updateCall = sendMock.mock.calls[1][0];
    expect(updateCall.input.ExpressionAttributeValues[':requests']).toHaveLength(1);
    expect(updateCall.input.ExpressionAttributeValues[':requests'][0].status).toBe('REQUESTED');
  });

  it('não falha quando a notificação por SQS falha (notifyByEmail é no-op em erro)', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } });
    notifyByEmailMock.mockResolvedValue(undefined); // simula notify.js já ter engolido o erro

    const result = await createScheduleRequest(STUDENT_ID, SCHEDULE_ID);
    expect(result.message).toBe('Solicitação de agendamento enviada com sucesso.');
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(createScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleStateException quando status não é AVAILABLE/REQUESTED', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...AVAILABLE_SCHEDULE, status: 'BOOKED' } });
    await expect(createScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleStateException);
  });

  it('lança ScheduleNotFoundException quando o coach não existe', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    await expect(createScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleInternalException quando coach não tem e-mail', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID } });
    await expect(createScheduleRequest(STUDENT_ID, SCHEDULE_ID)).rejects.toThrow(ScheduleInternalException);
  });
});

describe('create-schedule-request › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('retorna 200 com sucesso', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));
    expect(res.statusCode).toBe(200);
  });

  it('retorna 400 sem scheduleId (antes do JWT)', async () => {
    const res = await handler({ body: JSON.stringify({}) });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID }) });
    expect(res.statusCode).toBe(401);
  });
});

describe('create-schedule-request › concorrência', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('condiciona a escrita ao requests lido', async () => {
    const existing = [{ studentId: 'student-2', status: 'REQUESTED' }];
    sendMock
      .mockResolvedValueOnce({ Item: { ...AVAILABLE_SCHEDULE, status: 'REQUESTED', requests: existing } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } });

    await createScheduleRequest(STUDENT_ID, SCHEDULE_ID);

    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.ConditionExpression).toContain('#req = :expectedRequests');
    expect(updateCommand.input.ExpressionAttributeValues[':expectedRequests']).toEqual(existing);
  });

  it('usa :expectedRequests null quando o schedule ainda não tem requests', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { coachId: COACH_ID, email: 'coach@teste.com' } });

    await createScheduleRequest(STUDENT_ID, SCHEDULE_ID);

    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.ConditionExpression).toContain('attribute_not_exists(#req)');
    expect(updateCommand.input.ExpressionAttributeValues[':expectedRequests']).toBeNull();
  });

  it('devolve 409 quando outra solicitação gravou primeiro', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: AVAILABLE_SCHEDULE })
      .mockRejectedValueOnce(Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
        Item: AVAILABLE_SCHEDULE,
      }));

    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID }));

    expect(res.statusCode).toBe(409);
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });
});
