import { httpHandler, jsonResponse } from '../../shared/http.js';
import { parseJsonBody } from '../shared/params.js';
import { assertRequiredFields } from '../shared/validation.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { createSchedule } from './index.js';

const REQUIRED_FIELDS = ['gymId', 'price', 'specialtyId', 'startDateTime', 'endDateTime'];

// Campos obrigatórios são checados aqui (400) ANTES do JWT — formato de data e
// conflito de horário ficam para `./index.js` e voltam juntos como 422.
export const handler = httpHandler(async (event) => {
  const body = parseJsonBody(event);
  assertRequiredFields(body, REQUIRED_FIELDS);

  const coachId = getActorIdFromJwt(event);
  return jsonResponse(201, await createSchedule(coachId, body));
});
