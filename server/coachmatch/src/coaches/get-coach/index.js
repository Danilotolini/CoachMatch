import { findCoachById } from './repository.js';
import { NotFoundException } from '../../shared/exceptions.js';

/**
 * Mapeia o registro DynamoDB para o shape CoachMe esperado pelo front-end.
 * Garante que todos os campos opcionais tenham valores padrão seguros.
 *
 * @param {object} record - Registro bruto do DynamoDB.
 * @returns {object} Perfil do coach formatado.
 */
const mapToCoachMe = (record) => {
  const profile = record.profile ?? {};
  const locations = record.work_location ?? [];
  const gyms = locations.filter((l) => l.type === 'GYM');
  const homeService = locations.find((l) => l.type === 'HOME_SERVICE');

  // Status interno PENDING_PROFILE é exposto como PROFILE_INCOMPLETE ao front-end
  const STATUS_MAP = { PENDING_PROFILE: 'PROFILE_INCOMPLETE' };
  const status = STATUS_MAP[record.status] ?? record.status;

  return {
    email:           record.email,
    name:            profile.name          ?? null,
    phone:           profile.phone         ?? null,
    instagram:       profile.instagram     ?? null,
    cref:            profile.cref          ?? null,
    profilePhoto:    profile.profile_photo ?? null,
    profileVideo:    profile.profile_video ?? null,
    specialties:     profile.specialties   ?? [],
    territory:       gyms.length > 0 ? 'GYMS' : homeService ? 'HOME_SERVICE' : null,
    gyms:            gyms.map((l) => l.gymId),
    serviceRadius:   homeService?.serviceRadius ?? null,
    status,
    rejectionReason: record.rejection_reason ?? null,
  };
};

/**
 * Recupera e formata o perfil do coach autenticado.
 *
 * @param {string} coachId - ID do coach extraído do JWT.
 * @returns {object} Perfil formatado (shape CoachMe).
 * @throws {NotFoundException} Se o coach não existir.
 */
export const getCoachProfile = async (coachId) => {
  const record = await findCoachById(coachId);
  if (!record) throw new NotFoundException('Coach', coachId);

  return mapToCoachMe(record);
};
