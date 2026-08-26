import { withLogger } from '../../shared/logger.js';
import { submitForReview } from './index.js';
import { getCoachProfile } from '../get-coach/index.js';
import { NotFoundException, ConflictException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: POST /coaches/me/submit-for-review
 *
 * Transiciona o coach de PENDING_PROFILE (ou REJECTED) para PENDING_REVIEW.
 * Retorna o perfil atualizado no shape `Coach` esperado pelo front-end.
 *
 * Front-end chama via `submitCoachForReview()` em client/src/api/coaches.ts.
 */
const _handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  try {
    await submitForReview(coachId);
    const updatedCoach = await getCoachProfile(coachId);
    return { statusCode: 200, body: JSON.stringify(updatedCoach) };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return { statusCode: 404, body: JSON.stringify({ message: err.message }) };
    }
    if (err instanceof ConflictException) {
      return { statusCode: 409, body: JSON.stringify({ message: err.message }) };
    }
    throw err;
  }
};
export const handler = withLogger(_handler);
