import { studentProfileSchema } from './schema.js';
import { updateStudentProfile } from './repository.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Atualiza o perfil do estudante com dados pessoais e de localização.
 * Avança o status de ONBOARDING_PROFILE → ONBOARDING_HEALTH.
 *
 * @param {string} studentId - ID do estudante extraído do JWT.
 * @param {object} profileData - Dados do perfil enviados pelo cliente.
 */
export const updateProfile = async (studentId, profileData) => {
  const { error, value } = studentProfileSchema.validate(profileData, { abortEarly: false });
  if (error) throw new ValidationException('Dados de perfil inválidos', error.details);

  await updateStudentProfile(studentId, value);
};
