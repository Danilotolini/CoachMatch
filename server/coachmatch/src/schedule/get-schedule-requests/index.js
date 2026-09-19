import { getScheduleById, getStudentsProfile } from '../shared/repository.js';
import { BadRequestException, ScheduleForbiddenException, ScheduleNotFoundException } from '../shared/exceptions.js';

/**
 * GET /coach/schedule/requests — lista os requests de um schedule do coach
 * autenticado, enriquecidos com o nome do aluno.
 */
export const getScheduleRequests = async (coachId, qs = {}) => {
  const scheduleId = qs.scheduleId;
  if (!scheduleId) throw new BadRequestException("Campo obrigatório ausente: 'scheduleId'.");

  const schedule = await getScheduleById(scheduleId);
  if (!schedule) throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);

  if (schedule.coachId !== coachId) {
    throw new ScheduleForbiddenException('Você não tem permissão para ver as solicitações deste agendamento.');
  }

  const requests = schedule.requests ?? [];
  if (requests.length === 0) {
    return { scheduleId, count: 0, requests: [] };
  }

  const studentIds = [...new Set(requests.map((r) => r.studentId))];
  const studentsById = await getStudentsProfile(studentIds);

  const enrichedRequests = requests.map((r) => ({
    ...r,
    studentName: studentsById[r.studentId]?.profile?.name ?? null,
  }));

  return {
    scheduleId,
    startDateTime: schedule.startDateTime,
    endDateTime: schedule.endDateTime,
    status: schedule.status,
    count: enrichedRequests.length,
    requests: enrichedRequests,
  };
};
