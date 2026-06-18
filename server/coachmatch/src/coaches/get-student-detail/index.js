import { coachHasSessionWithStudent, findStudentById } from './repository.js';
import { ForbiddenException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Mapeia o registro do aluno para o detalhe que o coach pode ver.
 *
 * Expõe apenas o que é relevante para o treino: nome, gênero, data de
 * nascimento, objetivo e o questionário PAR-Q (health). NÃO expõe dados de
 * contato/identificação (email, telefone, CEP, cidade/estado, raio).
 *
 * @param {object} record - Registro bruto do aluno no DynamoDB.
 * @returns {object} Detalhe do aluno para o coach.
 */
const mapToCoachStudentDetail = (record) => ({
  studentId: record.studentId,
  name:      record.profile?.name ?? null,
  gender:    record.gender        ?? null,
  birthDate: record.birthDate     ?? null,
  goal:      record.goal          ?? null,
  health:    record.health        ?? null,
});

/**
 * Recupera o detalhe de um aluno para o coach autenticado.
 *
 * @param {object} params
 * @param {string} params.coachId   - ID do coach extraído do JWT.
 * @param {string} params.studentId - ID do aluno solicitado.
 * @returns {Promise<object>} Detalhe do aluno (sem dados de contato).
 * @throws {ForbiddenException} Se o coach não tiver sessão com o aluno.
 * @throws {NotFoundException}  Se o aluno não existir.
 */
export const getStudentDetailForCoach = async ({ coachId, studentId }) => {
  const linked = await coachHasSessionWithStudent(coachId, studentId);
  if (!linked) {
    throw new ForbiddenException('Você não tem sessões com este aluno.');
  }

  const record = await findStudentById(studentId);
  if (!record) throw new NotFoundException('Aluno', studentId);

  return mapToCoachStudentDetail(record);
};
