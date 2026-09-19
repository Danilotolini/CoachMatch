import { getScheduleById, setScheduleStatus, getCoachName, getStudentsContact } from '../shared/repository.js';
import { notifyByEmail } from '../shared/notify.js';
import { formatScheduleDateTime } from '../shared/format.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS, REQUEST_STATUS, CANCELLABLE_SCHEDULE_STATUSES } from '../shared/constants.js';

/**
 * POST /coach/schedule/cancel — coach cancela um schedule (AVAILABLE/REQUESTED/BOOKED).
 * Notifica o aluno reservado (se BOOKED) ou todos com request REQUESTED pendente.
 */
export const cancelSchedule = async (coachId, scheduleId) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  if (schedule.coachId !== coachId) {
    throw new ScheduleForbiddenException('Você não tem permissão para cancelar este agendamento.');
  }

  const currentStatus = schedule.status;
  if (!CANCELLABLE_SCHEDULE_STATUSES.includes(currentStatus)) {
    throw new ScheduleStateException(`Agendamento não pode ser cancelado: status atual '${currentStatus}'.`);
  }

  const now = new Date().toISOString();
  await setScheduleStatus(scheduleId, { status: SCHEDULE_STATUS.CANCELLED, updatedAt: now });

  const coachName = await getCoachName(coachId);
  const { date, time } = formatScheduleDateTime(schedule.startDateTime);

  let studentsToNotify = [];
  if (currentStatus === SCHEDULE_STATUS.BOOKED) {
    if (schedule.studentId) studentsToNotify = [schedule.studentId];
  } else {
    const requests = schedule.requests ?? [];
    studentsToNotify = requests.filter((r) => r.status === REQUEST_STATUS.REQUESTED).map((r) => r.studentId);
  }

  if (studentsToNotify.length) {
    const studentsById = await getStudentsContact(studentsToNotify);
    await Promise.all(studentsToNotify.map((studentId) => {
      const email = studentsById[studentId]?.email;
      if (!email) return undefined;
      return notifyByEmail({
        email,
        subject: 'Aula cancelada pelo Coach',
        body: `Infelizmente a aula com o coach ${coachName} para o dia ${date} às ${time} horas foi cancelada. `
          + 'Não fique sem treinar. Acesse agora CoachMatch.com.br e busque um novo horário.',
      });
    }));
  }

  return {
    message: 'Agendamento cancelado com sucesso.',
    scheduleId,
    status: SCHEDULE_STATUS.CANCELLED,
    notifiedStudents: studentsToNotify.length,
    cancelledAt: now,
  };
};
