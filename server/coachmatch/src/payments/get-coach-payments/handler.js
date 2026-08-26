import { withLogger } from '../../shared/logger.js';
import { getCoachPayments } from './index.js';

const _handler = async (event) => {
  const callerId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!callerId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado.' }) };
  }

  const coachId = event?.pathParameters?.coachId;
  if (!coachId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'coachId é obrigatório.' }) };
  }

  if (callerId !== coachId) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Acesso negado.' }) };
  }

  const transactions = await getCoachPayments(coachId);
  return { statusCode: 200, body: JSON.stringify({ transactions, total: transactions.length }) };
};
export const handler = withLogger(_handler);
