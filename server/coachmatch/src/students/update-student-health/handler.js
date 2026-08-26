import { withLogger } from '../../shared/logger.js';
import { updateHealth } from './index.js';
import { getStudentProfile } from '../get-student/index.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: POST /clients/me/health
 * Recebe o questionário PAR-Q e consentimentos do estudante.
 * Retorna o perfil atualizado compatível com o tipo Client do front-end.
 */
const _handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body ?? {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Body inválido.' }) };
  }

  try {
    await updateHealth(studentId, body);
    const updatedClient = await getStudentProfile(studentId);
    return { statusCode: 200, body: JSON.stringify(updatedClient) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
export const handler = withLogger(_handler);
