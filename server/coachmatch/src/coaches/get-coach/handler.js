import { withLogger } from '../../shared/logger.js';
import { getCoachProfile } from './index.js';
import { NotFoundException } from '../../shared/exceptions.js';
import { ensureLocalRecord } from '../../shared/local-autoseed.js';

/**
 * Handler HTTP: GET /coaches/me
 * Retorna o perfil completo do coach autenticado.
 */
const _handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  // No-op fora da stage local — ver shared/local-autoseed.js.
  await ensureLocalRecord('coach', event);

  try {
    const profile = await getCoachProfile(coachId);
    return { statusCode: 200, body: JSON.stringify(profile) };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return { statusCode: 404, body: JSON.stringify({ message: err.message }) };
    }
    throw err;
  }
};
export const handler = withLogger(_handler);
