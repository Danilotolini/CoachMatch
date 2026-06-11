import { updateCoachInputSchema } from './schema.js';
import { findCoachById, persistCoachUpdate } from './repository.js';
import { ValidationException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Constrói o array work_location a partir do payload flat do front-end.
 * @param {object} body - Payload validado.
 * @returns {object[]}
 */
const buildWorkLocation = (body) => {
  if (body.territory === 'GYMS') {
    return (body.gyms ?? []).map((gymId) => ({ type: 'GYM', gymId }));
  }
  if (body.territory === 'HOME_SERVICE') {
    return [{ type: 'HOME_SERVICE', serviceRadius: body.serviceRadius ?? 10 }];
  }
  return [];
};

/**
 * Atualiza o perfil do coach com os dados enviados pelo front-end.
 * Realiza a transição de status PENDING_PROFILE → PENDING_REVIEW na primeira atualização.
 *
 * @param {string} coachId - ID do coach extraído do JWT.
 * @param {object} body    - Payload flat enviado pelo front-end.
 * @throws {NotFoundException}  Se o coach não existir.
 * @throws {ValidationException} Se o payload for inválido.
 */
export const updateCoachProfile = async (coachId, body) => {
  const current = await findCoachById(coachId);
  if (!current) throw new NotFoundException('Coach', coachId);

  const { error, value } = updateCoachInputSchema.validate(body, { abortEarly: false });
  if (error) throw new ValidationException('Dados do perfil inválidos', error.details);

  // Normaliza campos que o front-end pode enviar sem prefixo
  const cref      = value.cref.startsWith('CREF ')  ? value.cref      : `CREF ${value.cref}`;
  const instagram = value.instagram.startsWith('@') ? value.instagram : `@${value.instagram}`;

  const newStatus =
    current.status === 'PENDING_PROFILE' ? 'PENDING_REVIEW' : current.status;

  await persistCoachUpdate(coachId, {
    profile: {
      name:          value.name,
      phone:         value.phone,
      specialties:   value.specialties,
      cref,
      instagram,
      profile_video: value.profileVideo,
    },
    work_location: buildWorkLocation(value),
    status: newStatus,
  });
};
