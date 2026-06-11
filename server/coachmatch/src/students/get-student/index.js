import { findStudentById } from './repository.js';
import { NotFoundException } from '../../shared/exceptions.js';

/**
 * Monta a resposta de perfil do estudante a partir do registro DynamoDB.
 * @param {object} record - Registro bruto do DynamoDB.
 * @returns {object} Perfil do estudante formatado para o cliente.
 */
const mapToStudentProfile = (record) => ({
  studentId:   record.studentId,
  email:       record.email,
  status:      record.status,
  name:        record.profile?.name    ?? null,
  phone:       record.phone            ?? null,
  birthDate:   record.birthDate        ?? null,
  gender:      record.gender           ?? null,
  cep:         record.cep              ?? null,
  city:        record.city             ?? null,
  state:       record.state            ?? null,
  radius:      record.radius           ?? null,
  goal:        record.goal             ?? null,
  health:      record.health           ?? null,
});

/**
 * Recupera e formata o perfil completo do estudante.
 *
 * @param {string} studentId - ID do estudante extraído do JWT.
 * @returns {object} Perfil formatado.
 * @throws {NotFoundException} Se o estudante não existir.
 */
export const getStudentProfile = async (studentId) => {
  const record = await findStudentById(studentId);
  if (!record) throw new NotFoundException('Estudante', studentId);

  return mapToStudentProfile(record);
};
