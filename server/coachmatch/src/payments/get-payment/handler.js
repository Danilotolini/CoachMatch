import { getPayment } from './index.js';

export const handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
  }

  const transactionId = event?.pathParameters?.transactionId;
  if (!transactionId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'transactionId é obrigatório.' }) };
  }

  const transaction = await getPayment(transactionId);

  if (!transaction) {
    return { statusCode: 404, body: JSON.stringify({ message: `Transação ${transactionId} não encontrada.` }) };
  }

  if (callerId !== transaction.studentId && callerId !== transaction.coachId) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
  }

  return { statusCode: 200, body: JSON.stringify(transaction) };
};
