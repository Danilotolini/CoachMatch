import { queryBookedSchedules, scanSchedulesWithRequests } from './repository.js';
import { byStringKey } from '../../shared/compare.js';

const toOutputItem = (item, studentId) => {
  const requests = item.requests ?? [];
  const studentRequest = requests.find((r) => r.studentId === studentId) ?? null;
  return {
    scheduleId: item.scheduleId ?? null,
    coachId: item.coachId ?? null,
    gymId: item.gymId ?? null,
    specialtyId: item.specialtyId ?? null,
    price: item.price ?? null,
    startDateTime: item.startDateTime ?? null,
    endDateTime: item.endDateTime ?? null,
    scheduleStatus: item.status ?? null,
    paymentStatus: item.paymentStatus ?? null,
    paymentTransactionId: item.paymentTransactionId ?? null,
    request: studentRequest,
  };
};

/**
 * GET /student/coach/schedules/request — todos os schedules em que o aluno
 * autenticado tem/teve uma solicitação (BOOKED via GSI + REQUESTED/CANCELLED via Scan).
 */
export const getStudentRequests = async (studentId) => {
  const resultsByScheduleId = new Map();

  const bookedItems = await queryBookedSchedules(studentId);
  for (const item of bookedItems) {
    resultsByScheduleId.set(item.scheduleId, item);
  }

  const scannedItems = await scanSchedulesWithRequests();
  for (const item of scannedItems) {
    if (resultsByScheduleId.has(item.scheduleId)) continue;
    const requests = item.requests ?? [];
    const studentInRequests = requests.some((r) => r.studentId === studentId);
    if (studentInRequests) resultsByScheduleId.set(item.scheduleId, item);
  }

  const schedules = [...resultsByScheduleId.values()]
    .map((item) => toOutputItem(item, studentId))
    .sort(byStringKey((item) => item.startDateTime));

  return { studentId, count: schedules.length, schedules };
};
