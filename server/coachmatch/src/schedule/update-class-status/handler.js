import Joi from 'joi';
import { httpHandler, jsonResponse } from '../../shared/http.js';
import { parseJsonBody } from '../shared/params.js';
import { assertValid, requiredStringField } from '../shared/validation.js';
import { getActorIdFromJwt } from '../shared/auth.js';
import { CLASS_STATUS_ALLOWED } from '../shared/constants.js';
import { updateClassStatus } from './index.js';

const BODY_SCHEMA = Joi.object({
  scheduleId: requiredStringField('scheduleId'),
  status: requiredStringField('status', {
    // `{#value}` é o placeholder do Joi para o valor recebido.
    'any.only': `'status' inválido: recebido '{#value}', esperado um de: ${CLASS_STATUS_ALLOWED.join(', ')}.`,
  }).valid(...CLASS_STATUS_ALLOWED),
}).unknown(true);

export const handler = httpHandler(async (event) => {
  const body = parseJsonBody(event);
  assertValid(BODY_SCHEMA, body);

  const { scheduleId, status } = body;
  const coachId = getActorIdFromJwt(event);
  return jsonResponse(200, await updateClassStatus(coachId, scheduleId, status));
});
