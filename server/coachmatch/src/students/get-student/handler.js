import { withLogger } from '../../shared/logger.js';
import { getStudentProfile } from './index.js';
import { NotFoundException } from '../../shared/exceptions.js';
import { ensureLocalRecord } from '../../shared/local-autoseed.js';

/**
 * Handler HTTP: GET /clients/me
 * Retorna o perfil completo do estudante autenticado.
 */
const _handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  // No-op fora da stage local — ver shared/local-autoseed.js.
  await ensureLocalRecord('student', event);

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
export const handler = withLogger(_handler);
