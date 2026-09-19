import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
const { notifyByEmailMock } = vi.hoisted(() => ({ notifyByEmailMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));
vi.mock('../shared/notify.js', () => ({
  notifyByEmail: notifyByEmailMock,
}));

import { handler } from '../approve-schedule-request/handler.js';
import { approveScheduleRequest } from '../approve-schedule-request/index.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';

const COACH_ID = 'coach-1';
const SCHEDULE_ID = 'avl_1';
const APPROVED_STUDENT = 'student-1';
const REJECTED_STUDENT = 'student-2';

const buildEvent = (body) => ({
  requestContext: { authorizer: { jwt: { claims: { sub: COACH_ID } } } },
  body: JSON.stringify(body),
});

const SCHEDULE_WITH_REQUESTS = {
  scheduleId: SCHEDULE_ID, coachId: COACH_ID, startDateTime: '2026-06-01T07:00:00-03:00',
  status: 'REQUESTED',
  requests: [
    { studentId: APPROVED_STUDENT, status: 'REQUESTED' },
    { studentId: REJECTED_STUDENT, status: 'REQUESTED' },
  ],
};

describe('approve-schedule-request › index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('aprova o aluno indicado e rejeita os demais, notificando ambos', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS }) // get schedule
      .mockResolvedValueOnce({}) // update
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } }) // coach name
      .mockResolvedValueOnce({
        Responses: {
          student: [
            { studentId: APPROVED_STUDENT, email: 'a@teste.com' },
            { studentId: REJECTED_STUDENT, email: 'b@teste.com' },
          ],
        },
      }); // batch get students

    const result = await approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT);
    expect(result.status).toBe('BOOKED');
    expect(result.studentId).toBe(APPROVED_STUDENT);
    expect(notifyByEmailMock).toHaveBeenCalledTimes(2);
    expect(notifyByEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@teste.com', subject: 'Sua aula esta agendada' }));
    expect(notifyByEmailMock).toHaveBeenCalledWith(expect.objectContaining({ email: 'b@teste.com', subject: 'Sua requisição de aula foi rejeitada' }));
  });

  it('não notifica alunos sem e-mail cadastrado', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } })
      .mockResolvedValueOnce({ Responses: { student: [] } });

    await approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT);
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });

  it('usa coachId como fallback quando busca de nome do coach falha (não derruba a resposta)', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('ThrottlingException'))
      .mockResolvedValueOnce({ Responses: { student: [] } });

    const result = await approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT);
    expect(result.status).toBe('BOOKED');
  });

  it('lança ScheduleNotFoundException quando schedule não existe', async () => {
    sendMock.mockResolvedValueOnce({});
    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT)).rejects.toThrow(ScheduleNotFoundException);
  });

  it('lança ScheduleForbiddenException quando coachId não bate', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, coachId: 'other' } });
    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT)).rejects.toThrow(ScheduleForbiddenException);
  });

  it('lança ScheduleStateException quando não há requests pendentes', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, requests: [] } });
    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT)).rejects.toThrow(ScheduleStateException);
  });

  it('lança ScheduleStateException quando o aluno aprovado não tem request', async () => {
    sendMock.mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS });
    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, 'nao-tem-request')).rejects.toThrow(ScheduleStateException);
  });

  it('não aprova aluno cuja solicitação já foi cancelada', async () => {
    sendMock.mockResolvedValueOnce({
      Item: {
        ...SCHEDULE_WITH_REQUESTS,
        status: 'REQUESTED',
        requests: [
          { studentId: APPROVED_STUDENT, status: 'CANCELLED' },
          { studentId: REJECTED_STUDENT, status: 'REQUESTED' },
        ],
      },
    });

    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT))
      .rejects.toThrow(/não tem solicitação pendente/);
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });

  it('preserva solicitações canceladas em vez de marcá-las como REJECTED', async () => {
    const cancelled = { studentId: REJECTED_STUDENT, status: 'CANCELLED', alteredAt: '2026-05-01T00:00:00.000Z' };
    sendMock
      .mockResolvedValueOnce({
        Item: {
          ...SCHEDULE_WITH_REQUESTS,
          requests: [{ studentId: APPROVED_STUDENT, status: 'REQUESTED' }, cancelled],
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } })
      .mockResolvedValueOnce({ Responses: { student: [{ studentId: REJECTED_STUDENT, email: 'b@teste.com' }] } });

    await approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT);

    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.ExpressionAttributeValues[':requests']).toContainEqual(cancelled);
    // Quem cancelou não recebe aviso de rejeição.
    expect(notifyByEmailMock).not.toHaveBeenCalled();
  });

  it('recusa aprovar um schedule que não está REQUESTED', async () => {
    sendMock.mockResolvedValueOnce({ Item: { ...SCHEDULE_WITH_REQUESTS, status: 'CANCELLED' } });

    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT))
      .rejects.toThrow(/status atual 'CANCELLED'/);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('condiciona a escrita ao status e ao requests lidos', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } })
      .mockResolvedValueOnce({ Responses: { student: [] } });

    await approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT);

    const [, [updateCommand]] = sendMock.mock.calls;
    expect(updateCommand.input.ConditionExpression).toContain('#st = :expectedStatus');
    expect(updateCommand.input.ConditionExpression).toContain('#req = :expectedRequests');
    expect(updateCommand.input.ExpressionAttributeValues[':expectedStatus']).toBe('REQUESTED');
    expect(updateCommand.input.ExpressionAttributeValues[':expectedRequests'])
      .toEqual(SCHEDULE_WITH_REQUESTS.requests);
  });

  it('traduz falha da condição com item antigo em 409', async () => {
    const conditionFailure = Object.assign(new Error('conditional'), {
      name: 'ConditionalCheckFailedException',
      Item: SCHEDULE_WITH_REQUESTS,
    });
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockRejectedValueOnce(conditionFailure);

    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('traduz falha da condição sem item antigo em 404', async () => {
    const conditionFailure = Object.assign(new Error('conditional'), {
      name: 'ConditionalCheckFailedException',
    });
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockRejectedValueOnce(conditionFailure);

    await expect(approveScheduleRequest(COACH_ID, SCHEDULE_ID, APPROVED_STUDENT))
      .rejects.toThrow(ScheduleNotFoundException);
  });
});

describe('approve-schedule-request › handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyByEmailMock.mockResolvedValue(undefined);
  });

  it('retorna 400 com campos ausentes (antes do JWT)', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID }) });
    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({ body: JSON.stringify({ scheduleId: SCHEDULE_ID, studentId: APPROVED_STUDENT }) });
    expect(res.statusCode).toBe(401);
  });

  it('retorna 200 com sucesso', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: SCHEDULE_WITH_REQUESTS })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ Item: { name: 'Coach Fulano' } })
      .mockResolvedValueOnce({ Responses: { student: [] } });
    const res = await handler(buildEvent({ scheduleId: SCHEDULE_ID, studentId: APPROVED_STUDENT }));
    expect(res.statusCode).toBe(200);
  });
});
