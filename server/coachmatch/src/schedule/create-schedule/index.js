import { randomBytes } from 'crypto';
import { queryCoachSchedulesForConflict, gymExists, specialtyExists, putSchedule } from './repository.js';
import { validateDateTimeRange } from '../shared/validation.js';
import { ScheduleStateException } from '../shared/exceptions.js';

const generateScheduleId = () => `avl_${randomBytes(16).toString('hex')}`;

const hasOverlap = (newStart, newEnd, existingStart, existingEnd) =>
  newStart < existingEnd && newEnd > existingStart;

const hasScheduleConflict = async (coachId, startDateTime, endDateTime) => {
  const items = await queryCoachSchedulesForConflict(coachId, endDateTime);
  const newStart = new Date(startDateTime).getTime();
  const newEnd = new Date(endDateTime).getTime();
  return items.some((item) => hasOverlap(
    newStart, newEnd, new Date(item.startDateTime).getTime(), new Date(item.endDateTime).getTime(),
  ));
};

/**
 * POST /coach/schedule — cria uma disponibilidade.
 *
 * Campos obrigatórios já foram checados no handler (400, antes do JWT).
 * Aqui: formato de data + conflito de horário + existência de gym/specialty
 * são todos acumulados na MESMA lista de erros e retornados juntos como 422
 * — inclusive erros de formato de data, que nas rotas de leitura seriam 400.
 */
export const createSchedule = async (coachId, body) => {
  const { gymId, price, specialtyId, startDateTime, endDateTime } = body;

  const errors = validateDateTimeRange(startDateTime, endDateTime);

  // Checagens independentes, disparadas em paralelo. A ordem do array é a ordem
  // em que as mensagens aparecem no corpo do 422. O conflito de horário só é
  // checado com datas válidas — sem elas não há intervalo para comparar.
  //
  // Cada checagem devolve a mensagem de reprovação ou `null`; falha de
  // infraestrutura NÃO vira mensagem aqui — propaga como ScheduleInternalException
  // (500). Dobrá-la no 422 diria ao cliente que o pedido é inválido, quando na
  // verdade só faltou tentar de novo.
  const checks = [];

  if (errors.length === 0) {
    checks.push((async () => (await hasScheduleConflict(coachId, startDateTime, endDateTime)
      ? `O coach '${coachId}' já tem um agendamento em conflito com ${startDateTime} – ${endDateTime}.`
      : null))());
  }

  checks.push(
    (async () => ((await gymExists(gymId)) ? null : `Academia '${gymId}' não encontrada.`))(),
    (async () => ((await specialtyExists(specialtyId)) ? null : `Especialidade '${specialtyId}' não encontrada.`))(),
  );

  errors.push(...(await Promise.all(checks)).filter(Boolean));

  if (errors.length) throw new ScheduleStateException(errors);

  const now = new Date().toISOString();

  // Os campos `null` fazem parte do corpo da resposta 201, mas não são gravados:
  // ver `putSchedule` em ./repository.js.
  const item = {
    scheduleId: generateScheduleId(),
    coachId,
    gymId,
    price,
    specialtyId,
    startDateTime,
    endDateTime,
    status: 'AVAILABLE',
    studentId: null,
    paymentStatus: null,
    rating: null,
    studentComment: null,
    requests: null,
    createdAt: now,
    updatedAt: now,
  };

  await putSchedule(item);

  return item;
};
