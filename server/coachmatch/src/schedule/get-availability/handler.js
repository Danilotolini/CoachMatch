import { httpHandler, jsonResponse } from '../../shared/http.js';
import { readParams } from '../shared/params.js';
import { getAvailability, COACH_AVAILABILITY, GYM_AVAILABILITY } from './index.js';

// Rotas públicas: sem checagem de autenticação (comportamento atual, mantido).
const availabilityHandler = (source) =>
  httpHandler(async (event) => jsonResponse(200, await getAvailability(source, readParams(event))));

export const coach = availabilityHandler(COACH_AVAILABILITY);
export const gym = availabilityHandler(GYM_AVAILABILITY);
