import { findCoachById } from './repository.js';
import { NotFoundException } from '../../shared/exceptions.js';
import { signGetUrl } from '../../shared/s3.js';

/**
 * Mapeia o registro DynamoDB para o shape `Coach` esperado pelo front-end.
 * Shape: { coachId, email, status, visibility, profile: { name, phone, ..., photo_url, video_url }, work_location, createdAt, updatedAt }
 *
 * As keys de mídia (`photo_key`/`video_key`) ficam só no banco; a resposta devolve
 * `photo_url`/`video_url` assinadas para leitura no bucket privado.
 *
 * @param {object} record - Registro bruto do DynamoDB.
 * @returns {Promise<object>} Perfil do coach no formato esperado pelo front-end.
 */
const mapToCoachMe = async (record) => {
  const profile = record.profile ?? {};
  const locations = Array.isArray(record.work_location) ? record.work_location : [];

  const [photo_url, video_url] = await Promise.all([
    signGetUrl(profile.photo_key),
    signGetUrl(profile.video_key),
  ]);

  return {
    coachId:   record.coachId,
    email:     record.email,
    status:    record.status,
    visibility: record.visibility ?? 'VISIBLE',
    profile: {
      name:        profile.name        ?? null,
      phone:       profile.phone       ?? null,
      specialties: profile.specialties ?? [],
      cref:        profile.cref        ?? '',
      instagram:   profile.instagram   ?? '',
      photo_url,
      video_url,
    },
    work_location: locations,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  };
};

/**
 * Recupera e formata o perfil do coach autenticado.
 *
 * @param {string} coachId - ID do coach extraído do JWT.
 * @returns {object} Coach no shape esperado pelo front-end.
 * @throws {NotFoundException} Se o coach não existir.
 */
export const getCoachProfile = async (coachId) => {
  const record = await findCoachById(coachId);
  if (!record) throw new NotFoundException('Coach', coachId);

  return mapToCoachMe(record);
};
