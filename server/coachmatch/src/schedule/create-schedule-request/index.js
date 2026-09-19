import { getScheduleById, updateScheduleRequests, getCoachById } from '../shared/repository.js';
import { notifyByEmail } from '../shared/notify.js';
import { formatScheduleDateTime } from '../shared/format.js';
import { ScheduleNotFoundException, ScheduleStateException, ScheduleInternalException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS, REQUEST_STATUS, REQUESTABLE_SCHEDULE_STATUSES } from '../shared/constants.js';

/**
 * POST /student/coach/schedules/request — aluno solicita uma aula disponível.
 *
 * Atenção à ordem: a busca do e-mail do coach acontece DEPOIS do schedule já
 * ter sido atualizado, então um coach sem e-mail cadastrado devolve erro com a
 * solicitação já persistida como REQUESTED. O envio da notificação em si nunca
 * falha a resposta (`notifyByEmail` é no-op em erro).
 */
export const createScheduleRequest = async (studentId, scheduleId) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  const status = schedule.status;
  const coachId = schedule.coachId;

  if (!REQUESTABLE_SCHEDULE_STATUSES.includes(status)) {
    throw new ScheduleStateException(`Agendamento não está disponível para solicitações: status atual '${status}'.`);
  }

  const now = new Date().toISOString();
  const newRequest = { studentId, status: REQUEST_STATUS.REQUESTED, requestedAt: now };
  const existingRequests = schedule.requests ?? [];
  const updatedRequests = [...existingRequests.filter((r) => r.studentId !== studentId), newRequest];

  await updateScheduleRequests(scheduleId, {
    requests: updatedRequests,
    status: SCHEDULE_STATUS.REQUESTED,
    updatedAt: now,
    expectedRequests: schedule.requests,
  });

  const coach = await getCoachById(coachId);
  if (!coach) throw new ScheduleNotFoundException(`Coach '${coachId}' não encontrado.`);

  const coachEmail = coach.email;
  if (!coachEmail) throw new ScheduleInternalException(`Coach '${coachId}' não tem e-mail cadastrado.`);

  const { date, time } = formatScheduleDateTime(schedule.startDateTime);
  await notifyByEmail({
    email: coachEmail,
    subject: 'Nova requisição de Aula recebida',
    body: `O aluno ${studentId} está interessado na aula do dia ${date} às ${time} horas. Acesse o CoachMatch para aprovar a aula.`,
  });

  return {
    message: 'Solicitação de agendamento enviada com sucesso.',
    scheduleId,
    studentId,
    status: REQUEST_STATUS.REQUESTED,
    requestedAt: now,
  };
};
