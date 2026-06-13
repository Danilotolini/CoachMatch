import { suggestGym } from './index.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: POST /gyms/suggest
 * Recebe a sugestão de uma nova academia e a persiste para revisão.
 */
export const handler = async (event) => {
  if (!event?.body) {
    throw new Error('Evento inválido: body ausente');
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  try {
    await suggestGym(body);
    return { statusCode: 201, body: JSON.stringify({ message: 'Academia sugerida com sucesso' }) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
