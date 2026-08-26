import { withLogger } from '../../shared/logger.js';
import { getStudentDetailForCoach } from './index.js';
import { ForbiddenException, NotFoundException } from '../../shared/exceptions.js';

/**
 * Handler HTTP: GET /coach/students/{studentId}
 * Retorna o detalhe de um aluno (sem dados de contato) para o coach autenticado,
 * desde que exista vínculo de sessão entre eles.
 */
const _handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Não autorizado' }),
    };
  }

  const studentId = event?.pathParameters?.studentId;
  if (!studentId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'studentId é obrigatório' }),
    };
  }

  try {
    const detail = await getStudentDetailForCoach({ coachId, studentId });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detail),
    };
  } catch (err) {
    if (err instanceof ForbiddenException) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: err.message }),
      };
    }
    if (err instanceof NotFoundException) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: err.message }),
      };
    }
    throw err;
  }
};
export const handler = withLogger(_handler);
