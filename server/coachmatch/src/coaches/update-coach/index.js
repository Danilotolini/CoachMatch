import { updateCoachInputSchema } from './schema.js';
import { findCoachById, persistCoachUpdate } from './repository.js';
import { ValidationException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Atualiza o perfil do coach com os dados enviados pelo front-end.
 *
 * Importante: ao preencher o perfil o coach é ativado imediatamente
 * (status APPROVED), sem passar pela etapa de revisão manual.
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

  // O GET devolve photo_url/video_url (assinadas), não as keys — então o front não
  // consegue reenviá-las. Preservamos a key atual quando o campo não vem no payload;
  // string vazia/null limpa a mídia explicitamente.
  const photo_key = resolveMediaKey(profile.photo_key, current.profile?.photo_key);
  const video_key = resolveMediaKey(profile.video_key, current.profile?.video_key);

  await persistCoachUpdate(coachId, {
    profile: {
      ...profile,
      cref:      normalizedCref,
      instagram: normalizedInstagram,
      photo_key,
      video_key,
    },
    work_location,
  });
};

/**
 * Resolve a key de mídia a persistir:
 *  - campo ausente (undefined) → mantém a key atual;
 *  - string vazia/null → limpa a mídia (null);
 *  - string preenchida → nova key.
 */
const resolveMediaKey = (incoming, current) => {
  if (incoming === undefined) return current ?? null;
  return incoming || null;
};
