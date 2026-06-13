import { studentHealthSchema } from './schema.js';
import { updateStudentHealth } from './repository.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Atualiza os dados de saúde do estudante.
 * Avança o status de ONBOARDING_HEALTH → ACTIVE.
 *
 * @param {string} studentId - ID do estudante extraído do JWT.
 * @param {object} healthData - Dados de saúde enviados pelo cliente.
 */
export const updateHealth = async (studentId, healthData) => {
  const { error, value } = studentHealthSchema.validate(healthData, { abortEarly: false });
  if (error) throw new ValidationException('Dados de saúde inválidos', error.details);

  await updateStudentHealth(studentId, value);
};
