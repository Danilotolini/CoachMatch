import { findStudentById } from './repository.js';
import { NotFoundException } from '../../shared/exceptions.js';
import { signGetUrl } from '../../shared/s3.js';

/**
 * Mapeia o registro DynamoDB para a forma Client esperada pelo front-end.
 * Usa `clientId` (não `studentId`) para alinhar com o tipo Client do frontend.
 * `photo_key` fica só no banco; a resposta devolve `photo_url` assinada.
 *
 * @param {object} record - Registro bruto do DynamoDB.
 * @returns {Promise<object>} Perfil do aluno formatado.
 */
const mapToClient = async (record) => ({
  clientId:   record.studentId,
  email:      record.email,
  status:     record.status,
  name:       record.profile?.name  ?? null,
  phone:      record.phone          ?? null,
  birthDate:  record.birthDate      ?? null,
  gender:     record.gender         ?? null,
  cep:        record.cep            ?? null,
  city:       record.city           ?? null,
  state:      record.state          ?? null,
  radius:     record.radius         ?? null,
  goal:       record.goal           ?? null,
  health:     record.health         ?? null,
  photo_url:  await signGetUrl(record.photo_key),
});

/**
 * Recupera e formata o perfil completo do aluno.
 *
 * @param {string} studentId - ID do aluno extraído do JWT.
 * @returns {object} Perfil formatado (shape Client).
 * @throws {NotFoundException} Se o aluno não existir.
 */
export const getStudentProfile = async (studentId) => {
  const record = await findStudentById(studentId);
  if (!record) throw new NotFoundException('Aluno', studentId);

  return mapToClient(record);
};
