import { updateProfile } from './index.js';
import { getStudentProfile } from '../get-student/index.js';
import { ValidationException } from '../../shared/exceptions.js';

/**
 * Normaliza número de telefone do formato visual do front-end "(11) 99999-9999"
 * para o formato canônico "+5511999999999".
 * Números que já estão no formato E.164 são retornados inalterados.
 *
 * @param {string} phone
 * @returns {string}
 */
const normalizePhone = (phone) => {
  if (phone.startsWith('+55')) return phone;
  const digits = phone.replace(/\D/g, '');
  return `+55${digits}`;
};

/**
 * Handler HTTP: POST /clients/me/profile
 * Recebe dados pessoais e de localização do estudante.
 * Retorna o perfil atualizado compatível com o tipo Client do front-end.
 */
export const handler = async (event) => {
  const studentId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!studentId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  // Normaliza o telefone antes de passar para a lógica de negócio
  const normalizedBody = body?.phone
    ? { ...body, phone: normalizePhone(body.phone) }
    : body;

  try {
    await updateProfile(studentId, normalizedBody);
    const updatedClient = await getStudentProfile(studentId);
    return { statusCode: 200, body: JSON.stringify(updatedClient) };
  } catch (err) {
    if (err instanceof ValidationException) {
      return { statusCode: 422, body: JSON.stringify({ message: err.message, details: err.details }) };
    }
    throw err;
  }
};
