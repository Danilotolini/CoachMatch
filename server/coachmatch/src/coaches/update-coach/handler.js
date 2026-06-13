import { updateCoachProfile } from './index.js';
import { getCoachProfile } from '../get-coach/index.js';
import { ValidationException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: PUT /coaches/me
 * Recebe o payload flat do front-end, atualiza o perfil e retorna o CoachMe atualizado.
 */
export const handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  try {
    await updateCoachProfile(coachId, body);
    const updatedCoach = await getCoachProfile(coachId);
    return { statusCode: 200, body: JSON.stringify(updatedCoach) };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return { statusCode: 404, body: JSON.stringify({ message: err.message }) };
    }
    if (err instanceof ValidationException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
