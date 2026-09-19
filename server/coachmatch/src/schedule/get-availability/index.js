import { queryAvailability } from './repository.js';
import { validateDateTimeRange, missingFieldErrors } from '../shared/validation.js';
import { PUBLIC_SCHEDULE_FIELDS, pickFields } from '../shared/fields.js';
import { BadRequestException } from '../shared/exceptions.js';

/** GET /student/coach/schedules — disponibilidade pública de um coach. */
export const COACH_AVAILABILITY = { index: 'Coach_Date', keyName: 'coachId' };

/** GET /student/gyms/schedule — disponibilidade pública de uma academia. */
export const GYM_AVAILABILITY = { index: 'Gym_Date', keyName: 'gymId' };

/**
 * Horários abertos numa janela de tempo, vistos por um aluno navegando —
 * daí a projeção em `PUBLIC_SCHEDULE_FIELDS`.
 *
 * `qs` é o `queryStringParameters` bruto: `missingFieldErrors` depende de checar
 * presença de chave (não truthiness), então não pode ser pré-desestruturado
 * em um objeto que sempre carrega as chaves (mesmo undefined).
 *
 * @param {{ index: string, keyName: string }} source GSI consultado e atributo
 *   que o particiona — também o campo obrigatório em `qs`.
 * @param {object} qs
 */
export const getAvailability = async ({ index, keyName }, qs = {}) => {
  const missing = missingFieldErrors(qs, [keyName, 'startDateTime', 'endDateTime']);
  if (missing.length) throw new BadRequestException(missing);

  const { startDateTime, endDateTime } = qs;
  const dateErrors = validateDateTimeRange(startDateTime, endDateTime);
  if (dateErrors.length) throw new BadRequestException(dateErrors);

  const keyValue = qs[keyName];
  const items = await queryAvailability({ index, keyName, keyValue, startDateTime, endDateTime });
  const schedules = items.map((item) => pickFields(item, PUBLIC_SCHEDULE_FIELDS));

  return { [keyName]: keyValue, startDateTime, endDateTime, count: schedules.length, schedules };
};
