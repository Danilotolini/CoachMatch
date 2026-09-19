import { persistApproval } from './repository.js';
import { getScheduleById, getCoachName, getStudentsContact } from '../shared/repository.js';
import { notifyByEmail } from '../shared/notify.js';
import { formatScheduleDateTime } from '../shared/format.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS, REQUEST_STATUS } from '../shared/constants.js';

/**
 * POST /coach/schedule/approve — coach aprova um dos requests pendentes.
 * O aluno aprovado vira `APPROVED`/schedule `BOOKED`; os demais requests
 * viram `REJECTED`. Notifica todos os alunos que tinham request (aprovado e
 * rejeitados) — falha ao buscar nome do coach ou e-mails dos alunos não derruba
 * a resposta: a aprovação já está persistida, então segue com fallback.
 */
export const approveScheduleRequest = async (coachId, scheduleId, approvedStudentId) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  if (schedule.coachId !== coachId) {
    throw new ScheduleForbiddenException('Você não tem permissão para aprovar este agendamento.');
  }

  if (schedule.status !== SCHEDULE_STATUS.REQUESTED) {
    throw new ScheduleStateException(
      `Agendamento não pode ser aprovado: status atual '${schedule.status}', esperado '${SCHEDULE_STATUS.REQUESTED}'.`,
    );
  }

  const requests = schedule.requests;
  if (!requests || requests.length === 0) {
    throw new ScheduleStateException('Este agendamento não tem solicitações pendentes.');
  }

  // Só solicitações ainda pendentes entram na aprovação. As já canceladas pelo
  // aluno continuam no array (ver `cancel-schedule-request`) e aprová-las
  // agendaria uma aula para quem desistiu.
  const pendingRequests = requests.filter((r) => r.status === REQUEST_STATUS.REQUESTED);
  if (!pendingRequests.some((r) => r.studentId === approvedStudentId)) {
    throw new ScheduleStateException(`O aluno '${approvedStudentId}' não tem solicitação pendente neste agendamento.`);
  }

  const now = new Date().toISOString();
  // Rejeita apenas as demais pendentes; CANCELLED/REJECTED anteriores ficam
  // como estão, preservando o histórico.
  const updatedRequests = requests.map((r) => {
    if (r.status !== REQUEST_STATUS.REQUESTED) return r;
    return {
      ...r,
      status: r.studentId === approvedStudentId ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.REJECTED,
      alteredAt: now,
    };
  });

  await persistApproval(scheduleId, {
    studentId: approvedStudentId,
    status: SCHEDULE_STATUS.BOOKED,
    requests: updatedRequests,
    updatedAt: now,
    expectedRequests: requests,
    expectedStatus: SCHEDULE_STATUS.REQUESTED,
  });

  // Notifica só quem teve a solicitação decidida agora — quem já havia
  // cancelado não recebe aviso de rejeição.
  const decidedRequests = pendingRequests.map((r) => ({
    studentId: r.studentId,
    status: r.studentId === approvedStudentId ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.REJECTED,
  }));

  const [coachName, studentsById] = await Promise.all([
    getCoachName(coachId),
    getStudentsContact([...new Set(decidedRequests.map((r) => r.studentId))]),
  ]);
  const { date, time } = formatScheduleDateTime(schedule.startDateTime);

  await Promise.all(decidedRequests.map((req) => {
    const email = studentsById[req.studentId]?.email;
    if (!email) return undefined;

    return req.status === REQUEST_STATUS.APPROVED
      ? notifyByEmail({
        email,
        subject: 'Sua aula esta agendada',
        body: `Sua aula com o coach ${coachName} para o dia ${date} às ${time} horas está agendada.`,
      })
      : notifyByEmail({
        email,
        subject: 'Sua requisição de aula foi rejeitada',
        body: `Sua aula com o coach ${coachName} para o dia ${date} às ${time} horas foi rejeitada. `
          + 'Não fique sem treinar. Acesse agora CoachMatch.com.br e busque um novo Coach.',
      });
  }));

  return {
    message: 'Agendamento aprovado com sucesso.',
    scheduleId,
    studentId: approvedStudentId,
    status: SCHEDULE_STATUS.BOOKED,
    updatedAt: now,
  };
};
