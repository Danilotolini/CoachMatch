import { withLogger } from '../../shared/logger.js';
import { getSessionPayments } from './index.js';

const _handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
  }

  const sessionId = event?.pathParameters?.sessionId;
  if (!sessionId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'sessionId é obrigatório.' }) };
  }

  const transactions = await getSessionPayments(sessionId);

  if (transactions.length > 0) {
    const { studentId, coachId } = transactions[0];
    if (callerId !== studentId && callerId !== coachId) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ transactions, total: transactions.length }) };
};
export const handler = withLogger(_handler);
