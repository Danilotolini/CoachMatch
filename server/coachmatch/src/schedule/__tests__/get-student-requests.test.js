import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { handler } from '../get-student-requests/handler.js';
import { getStudentRequests } from '../get-student-requests/index.js';
import { queryBookedSchedules, scanSchedulesWithRequests } from '../get-student-requests/repository.js';

const STUDENT_ID = 'student-1';

const buildEvent = () => ({ requestContext: { authorizer: { jwt: { claims: { sub: STUDENT_ID } } } } });

const BOOKED_ITEM = {
  scheduleId: 'avl_booked', studentId: STUDENT_ID, coachId: 'coach-1', gymId: 'gym-1', specialtyId: 'yoga',
  price: 100, startDateTime: '2026-06-01T07:00:00-03:00', endDateTime: '2026-06-01T08:00:00-03:00',
  status: 'BOOKED', paymentStatus: 'PAID', paymentTransactionId: 'txn_1',
  requests: [{ studentId: STUDENT_ID, status: 'APPROVED' }],
};

const REQUESTED_ITEM = {
  scheduleId: 'avl_requested', coachId: 'coach-2', gymId: 'gym-2', specialtyId: 'boxe',
  price: 80, startDateTime: '2026-05-20T07:00:00-03:00', endDateTime: '2026-05-20T08:00:00-03:00',
  status: 'REQUESTED', requests: [{ studentId: STUDENT_ID, status: 'REQUESTED' }],
};

const OTHER_STUDENT_ITEM = {
  scheduleId: 'avl_other', coachId: 'coach-3', startDateTime: '2026-05-01T07:00:00-03:00',
  requests: [{ studentId: 'someone-else', status: 'REQUESTED' }],
};

describe('get-student-requests › repository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queryBookedSchedules consulta a GSI Student_Date', async () => {
    sendMock.mockResolvedValue({ Items: [BOOKED_ITEM] });
    await queryBookedSchedules(STUDENT_ID);
    const [[command]] = sendMock.mock.calls;
    expect(command.input.IndexName).toBe('Student_Date');
  });

  it('scanSchedulesWithRequests segue LastEvaluatedKey até o fim', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [REQUESTED_ITEM], LastEvaluatedKey: { scheduleId: 'avl_requested' } })
      .mockResolvedValueOnce({ Items: [OTHER_STUDENT_ITEM] });

    const items = await scanSchedulesWithRequests();

    expect(items).toEqual([REQUESTED_ITEM, OTHER_STUDENT_ITEM]);
    expect(sendMock).toHaveBeenCalledTimes(2);
    const [[first], [second]] = sendMock.mock.calls;
    expect(first.input.ExclusiveStartKey).toBeUndefined();
    expect(second.input.ExclusiveStartKey).toEqual({ scheduleId: 'avl_requested' });
  });

  it('queryBookedSchedules também pagina', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [BOOKED_ITEM], LastEvaluatedKey: { scheduleId: 'avl_booked' } })
      .mockResolvedValueOnce({ Items: [] });

    const items = await queryBookedSchedules(STUDENT_ID);

    expect(items).toEqual([BOOKED_ITEM]);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});

describe('get-student-requests › index', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mescla itens do GSI (BOOKED) e do Scan (REQUESTED), ordenados por startDateTime', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [BOOKED_ITEM] })
      .mockResolvedValueOnce({ Items: [REQUESTED_ITEM, OTHER_STUDENT_ITEM] });

    const result = await getStudentRequests(STUDENT_ID);
    expect(result.studentId).toBe(STUDENT_ID);
    expect(result.count).toBe(2);
    expect(result.schedules.map((s) => s.scheduleId)).toEqual(['avl_requested', 'avl_booked']);
  });

  it('não duplica um scheduleId presente tanto no GSI quanto no Scan', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [BOOKED_ITEM] })
      .mockResolvedValueOnce({ Items: [BOOKED_ITEM] });

    const result = await getStudentRequests(STUDENT_ID);
    expect(result.count).toBe(1);
  });

  it('exclui itens onde o aluno não está em requests[]', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValueOnce({ Items: [OTHER_STUDENT_ITEM] });

    const result = await getStudentRequests(STUDENT_ID);
    expect(result.count).toBe(0);
  });

  it('inclui a own request do aluno no campo request', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [BOOKED_ITEM] })
      .mockResolvedValueOnce({ Items: [] });

    const result = await getStudentRequests(STUDENT_ID);
    expect(result.schedules[0].request).toEqual({ studentId: STUDENT_ID, status: 'APPROVED' });
    expect(result.schedules[0].scheduleStatus).toBe('BOOKED');
  });
});

describe('get-student-requests › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com a lista de schedules', async () => {
    sendMock.mockResolvedValue({ Items: [] });
    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(200);
  });

  it('retorna 401 sem JWT', async () => {
    const res = await handler({});
    expect(res.statusCode).toBe(401);
  });

  it('retorna 500 em falha do GSI', async () => {
    sendMock.mockRejectedValue(new Error('ThrottlingException'));
    const res = await handler(buildEvent());
    expect(res.statusCode).toBe(500);
  });
});
