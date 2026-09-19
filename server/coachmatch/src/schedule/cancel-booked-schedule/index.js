import { getScheduleById, setScheduleStatus, getCoachEmailAndName, getStudentName } from '../shared/repository.js';
import { notifyByEmail } from '../shared/notify.js';
import { formatScheduleDateTime } from '../shared/format.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS, CANCELLATION_WINDOW_HOURS } from '../shared/constants.js';

/**
 * POST /student/coach/schedules/cancel — aluno cancela uma aula BOOKED, desde
 * que faltem mais de 6h para o início.
 *
 * Atenção: aqui a checagem de status (422) vem ANTES da de ownership (403) —
 * ordem invertida em relação às demais funções de escrita do domínio. Trocar a
 * ordem mudaria o status devolvido em casos já cobertos por teste.
 */
export const cancelBookedSchedule = async (studentId, scheduleId) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  if (schedule.status !== SCHEDULE_STATUS.BOOKED) {
    throw new ScheduleStateException(`Agendamento não pode ser cancelado: status atual '${schedule.status}', esperado 'BOOKED'.`);
  }

  if (schedule.studentId !== studentId) {
    throw new ScheduleForbiddenException('Você não tem permissão para cancelar este agendamento.');
  }

  // Sem data legível não dá para saber se ainda estamos fora da janela de 6h;
  // `NaN <= deadline` é false, então a comparação sozinha deixaria passar.
  const startTime = new Date(schedule.startDateTime).getTime();
  if (Number.isNaN(startTime)) {
    throw new ScheduleStateException(
      `Agendamento tem 'startDateTime' inválido ('${schedule.startDateTime}') e não pode ser cancelado.`,
    );
  }

  const cancellationDeadline = Date.now() + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;
  if (startTime <= cancellationDeadline) {
    throw new ScheduleStateException('Cancelamento não permitido: a aula começa em menos de 6 horas.');
  }

  const now = new Date().toISOString();
  await setScheduleStatus(scheduleId, {
    status: SCHEDULE_STATUS.CANCELLED,
    updatedAt: now,
    expectedStatus: SCHEDULE_STATUS.BOOKED,
  });

  const [{ email: coachEmail, name: coachName }, studentName] = await Promise.all([
    getCoachEmailAndName(schedule.coachId),
    getStudentName(studentId),
  ]);

  if (coachEmail) {
    const { date, time } = formatScheduleDateTime(schedule.startDateTime);
    await notifyByEmail({
      email: coachEmail,
      subject: 'Aula cancelada pelo aluno',
      body: `O aluno ${studentName} cancelou a aula do dia ${date} às ${time} horas. Acesse o CoachMatch para gerenciar sua agenda.`,
    });
  }

  return { message: 'Agendamento cancelado com sucesso.', scheduleId, status: SCHEDULE_STATUS.CANCELLED, cancelledAt: now };
};
