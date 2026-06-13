import { getSessionPayments } from './index.js';

/**
 * Handler HTTP: GET /payments/session/{sessionId}
 * Retorna todas as transações de uma sessão.
 */
export const handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const sessionId = event?.pathParameters?.sessionId;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'sessionId é obrigatório.' }) };
  }

  const transactions = await getSessionPayments(sessionId);
  return { statusCode: 200, body: JSON.stringify({ transactions, total: transactions.length }) };
};
