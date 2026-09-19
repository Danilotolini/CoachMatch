import { persistClassStatus } from './repository.js';
import { getScheduleById } from '../shared/repository.js';
import { ScheduleForbiddenException, ScheduleNotFoundException, ScheduleStateException } from '../shared/exceptions.js';
import { SCHEDULE_STATUS } from '../shared/constants.js';

/**
 * POST /coach/schedule/class/status — coach finaliza uma aula como
 * COMPLETED/NOSHOW. Só permitido a partir de BOOKED; marca o repasse ao coach
 * como PENDING (o repasse em si é tratado fora deste fluxo), exceto quando o
 * aluno já pagou — nesse caso o PAID é preservado. Ver `persistClassStatus`.
 */
export const updateClassStatus = async (coachId, scheduleId, newStatus) => {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  if (schedule.coachId !== coachId) {
    throw new ScheduleForbiddenException('Você não tem permissão para atualizar este agendamento.');
  }

  const currentStatus = schedule.status;
  if (currentStatus !== SCHEDULE_STATUS.BOOKED) {
    throw new ScheduleStateException(`Agendamento não pode ser atualizado: status atual '${currentStatus}', esperado 'BOOKED'.`);
  }

  const now = new Date().toISOString();
  const paymentStatus = await persistClassStatus(scheduleId, {
    status: newStatus,
    updatedAt: now,
    currentPaymentStatus: schedule.paymentStatus,
  });

  return {
    message: `Agendamento atualizado para '${newStatus}' com sucesso.`,
    scheduleId,
    status: newStatus,
    paymentStatus,
    updatedAt: now,
  };
};
