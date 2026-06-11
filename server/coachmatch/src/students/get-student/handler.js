import { getStudentProfile } from './index.js';
import { NotFoundException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: GET /clients/me
 * Retorna o perfil completo do estudante autenticado.
 */
export const handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  try {
    const profile = await getStudentProfile(studentId);
    return { statusCode: 200, body: JSON.stringify(profile) };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return { statusCode: 404, body: JSON.stringify({ message: err.message }) };
    }
    throw err;
  }
};
