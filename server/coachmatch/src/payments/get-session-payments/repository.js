import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'payments';

/**
 * Retorna todas as transações de uma sessão.
 * @param {string} sessionId
 * @returns {object[]}
 */
export const findPaymentsBySession = async (sessionId) => {
  const docClient = createClient();
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :pk',
    ExpressionAttributeValues: { ':pk': `SESSION#${sessionId}` },
  }));
  return result.Items ?? [];
};
