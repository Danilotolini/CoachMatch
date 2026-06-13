import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'payments';

/**
 * Retorna todas as transações de um coach, ordenadas da mais recente para a mais antiga.
 * @param {string} coachId
 * @returns {object[]}
 */
export const findPaymentsByCoach = async (coachId) => {
  const docClient = createClient();
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `COACH#${coachId}` },
    ScanIndexForward: false,
  }));
  return result.Items ?? [];
};
