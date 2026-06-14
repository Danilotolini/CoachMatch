import { getStudentPayments } from './index.js';

export const handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
  }

  const studentId = event?.pathParameters?.studentId;
  if (!studentId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'studentId é obrigatório.' }) };
  }

  if (callerId !== studentId) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
  }

  const transactions = await getStudentPayments(studentId);
  return { statusCode: 200, body: JSON.stringify({ transactions, total: transactions.length }) };
};
