import { queryCoachSchedule } from './repository.js';
import { validateDateTimeRange, missingFieldErrors } from '../shared/validation.js';
import { BadRequestException } from '../shared/exceptions.js';

/**
 * GET /coach/schedule — agenda completa do coach autenticado num intervalo.
 *
 * `qs` é o `queryStringParameters` bruto: `missingFieldErrors` depende de checar
 * presença de chave (não truthiness), então não pode ser pré-desestruturado
 * em um objeto que sempre carrega as chaves (mesmo undefined).
 *
 * @param {string} coachId
 * @param {object} qs
 */
export const getOwnSchedule = async (coachId, qs = {}) => {
  const missing = missingFieldErrors(qs, ['startDateTime', 'endDateTime']);
  if (missing.length) throw new BadRequestException(missing);

  const { startDateTime, endDateTime } = qs;
  const dateErrors = validateDateTimeRange(startDateTime, endDateTime);
  if (dateErrors.length) throw new BadRequestException(dateErrors);

  const schedules = await queryCoachSchedule({ coachId, startDateTime, endDateTime });

  return { coachId, startDateTime, endDateTime, count: schedules.length, schedules };
};
