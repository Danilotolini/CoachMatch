import { updateCoachInputSchema } from './schema.js';
import { findCoachById, persistCoachUpdate } from './repository.js';
import { ValidationException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Atualiza o perfil do coach com os dados enviados pelo front-end.
 *
 * Importante: esta operação NÃO muda o status do coach.
 * A transição de status (ONBOARDING_PROFILE → PENDING_REVIEW) é feita
 * exclusivamente pelo endpoint POST /coaches/me/submit-for-review.
 *
 * @param {string} coachId - ID do coach extraído do JWT.
 * @param {object} body    - Payload aninhado: { profile: {...}, work_location: [...] }
 * @throws {NotFoundException}   Se o coach não existir.
 * @throws {ValidationException} Se o payload for inválido.
 */
export const updateCoachProfile = async (coachId, body) => {
  const current = await findCoachById(coachId);
  if (!current) throw new NotFoundException('Coach', coachId);

  const { error, value } = updateCoachInputSchema.validate(body, { abortEarly: false });
  if (error) throw new ValidationException('Dados do perfil inválidos', error.details);

  const { profile, work_location } = value;

  // Normaliza prefixos que o front-end pode ou não incluir
  const normalizedCref = profile.cref.startsWith('CREF ')
    ? profile.cref
    : `CREF ${profile.cref}`;
  const normalizedInstagram =
    profile.instagram && !profile.instagram.startsWith('@')
      ? `@${profile.instagram}`
      : profile.instagram;

  await persistCoachUpdate(coachId, {
    profile: {
      ...profile,
      cref:      normalizedCref,
      instagram: normalizedInstagram,
    },
    work_location,
    // Preserva o status atual — submit-for-review é quem transiciona
    status: current.status,
  });
};
