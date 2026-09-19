import { getScheduleById, updateScheduleRequests } from '../shared/repository.js';
import { ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS, REQUEST_STATUS, REQUESTABLE_SCHEDULE_STATUSES } from '../shared/constants.js';

/**
 * DELETE /student/coach/schedules/request — aluno cancela sua própria
 * solicitação pendente. Recalcula o status do schedule: `REQUESTED` se
 * restarem outras solicitações pendentes, senão `AVAILABLE`.
 */
export const cancelScheduleRequest = async (studentId, scheduleId) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  const status = schedule.status;
  if (!REQUESTABLE_SCHEDULE_STATUSES.includes(status)) {
    throw new ScheduleStateException(`Não é possível cancelar a solicitação: status do agendamento '${status}'.`);
  }

  const requests = schedule.requests ?? [];
  const studentRequest = requests.find((r) => r.studentId === studentId);
  if (!studentRequest) {
    throw new ScheduleNotFoundException(`Nenhuma solicitação encontrada para o aluno '${studentId}' neste agendamento.`);
  }

  if (studentRequest.status !== REQUEST_STATUS.REQUESTED) {
    throw new ScheduleStateException(`Solicitação não pode ser cancelada: status atual da solicitação '${studentRequest.status}'.`);
  }

  const now = new Date().toISOString();
  const updatedRequests = requests.map((r) =>
    r.studentId === studentId ? { ...r, status: REQUEST_STATUS.CANCELLED, alteredAt: now } : r
  );

  const hasOtherRequests = updatedRequests.some((r) => r.studentId !== studentId && r.status === REQUEST_STATUS.REQUESTED);
  const newScheduleStatus = hasOtherRequests ? SCHEDULE_STATUS.REQUESTED : SCHEDULE_STATUS.AVAILABLE;

  await updateScheduleRequests(scheduleId, {
    requests: updatedRequests,
    status: newScheduleStatus,
    updatedAt: now,
    expectedRequests: schedule.requests,
  });

  return {
    message: 'Solicitação cancelada com sucesso.',
    scheduleId,
    studentId,
    scheduleStatus: newScheduleStatus,
    cancelledAt: now,
  };
};
