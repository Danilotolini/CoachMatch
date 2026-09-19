import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}));

import { coachIsLinkedToStudent } from '../get-student-detail/repository.js';

const COACH_ID = 'coach-123';
const STUDENT_ID = 'student-456';

const empty = { Items: [], LastEvaluatedKey: undefined };

const scheduleWithRequests = (...requests) => ({
  scheduleId: 'avl_1',
  coachId: COACH_ID,
  status: 'REQUESTED',
  requests,
});

const indexOf = (call) => call[0].input.IndexName;

describe('get-student-detail › repository (coachIsLinkedToStudent)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sessão agendada basta: nem consulta as solicitações', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ scheduleId: 'avl_9' }] });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(indexOf(sendMock.mock.calls[0])).toBe('Student_Date');
  });

  it('sem sessão, solicitação pendente do aluno cria vínculo', async () => {
    sendMock.mockResolvedValueOnce(empty);
    sendMock.mockResolvedValueOnce({
      Items: [scheduleWithRequests({ studentId: STUDENT_ID, status: 'REQUESTED' })],
      LastEvaluatedKey: undefined,
    });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(true);
    expect(indexOf(sendMock.mock.calls[1])).toBe('Coach_Date');
  });

  it('solicitação cancelada NÃO cria vínculo', async () => {
    sendMock.mockResolvedValueOnce(empty);
    sendMock.mockResolvedValueOnce({
      Items: [scheduleWithRequests({ studentId: STUDENT_ID, status: 'CANCELLED' })],
      LastEvaluatedKey: undefined,
    });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(false);
  });

  it('solicitação pendente de outro aluno NÃO cria vínculo', async () => {
    sendMock.mockResolvedValueOnce(empty);
    sendMock.mockResolvedValueOnce({
      Items: [scheduleWithRequests({ studentId: 'outro-aluno', status: 'REQUESTED' })],
      LastEvaluatedKey: undefined,
    });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(false);
  });

  it('segue LastEvaluatedKey até achar a solicitação', async () => {
    sendMock.mockResolvedValueOnce(empty);
    sendMock.mockResolvedValueOnce({
      Items: [scheduleWithRequests({ studentId: 'outro-aluno', status: 'REQUESTED' })],
      LastEvaluatedKey: { scheduleId: 'avl_1' },
    });
    sendMock.mockResolvedValueOnce({
      Items: [scheduleWithRequests({ studentId: STUDENT_ID, status: 'REQUESTED' })],
      LastEvaluatedKey: undefined,
    });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(3);
  });

  it('sem sessão e sem solicitação, não há vínculo', async () => {
    sendMock.mockResolvedValue(empty);

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(false);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('schedule sem o atributo requests não quebra a checagem', async () => {
    sendMock.mockResolvedValueOnce(empty);
    sendMock.mockResolvedValueOnce({
      Items: [{ scheduleId: 'avl_2', coachId: COACH_ID }],
      LastEvaluatedKey: undefined,
    });

    expect(await coachIsLinkedToStudent(COACH_ID, STUDENT_ID)).toBe(false);
  });
});
