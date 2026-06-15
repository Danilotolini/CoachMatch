import { findCoachById, transitionToReview } from './repository.js';
import { NotFoundException, ConflictException } from '../../shared/exceptions.js';

/**
 * Status internos (DynamoDB) que permitem a submissão para revisão.
 *   PENDING_PROFILE = coach acabou de se cadastrar e ainda não enviou o perfil
 *   REJECTED        = coach foi rejeitado e pode reenviar após correções
 */
const SUBMITTABLE_STATUSES = ['PENDING_PROFILE', 'REJECTED'];

/**
 * Transiciona o coach para PENDING_REVIEW.
 * Permite submissão somente nos estados PENDING_PROFILE ou REJECTED.
 *
 * @param {string} coachId - ID do coach extraído do JWT.
 * @throws {NotFoundException}  Se o coach não existir.
 * @throws {ConflictException}  Se o status atual não permitir submissão.
 */
export const submitForReview = async (coachId) => {
  const coach = await findCoachById(coachId);
  if (!coach) throw new NotFoundException('Coach', coachId);

  if (!SUBMITTABLE_STATUSES.includes(coach.status)) {
    throw new ConflictException(
      `Estado atual (${coach.status}) não permite submissão para revisão.`
    );
  }

  try {
    await transitionToReview(coachId);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new ConflictException(
        `Estado atual não permite submissão para revisão (race condition detectada).`
      );
    }
    throw err;
  }
};
