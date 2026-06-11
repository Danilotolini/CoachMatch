import { updateProfile } from './index.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: POST /clients/me/profile
 * Recebe dados pessoais e de localização do estudante.
 */
export const handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  try {
    await updateProfile(studentId, body);
    return { statusCode: 200, body: JSON.stringify({ message: 'Perfil atualizado com sucesso' }) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
