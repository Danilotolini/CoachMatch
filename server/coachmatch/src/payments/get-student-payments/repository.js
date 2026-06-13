import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'payments';

/**
 * Retorna todas as transações de um aluno, ordenadas da mais recente para a mais antiga.
 * @param {string} studentId
 * @returns {object[]}
 */
export const findPaymentsByStudent = async (studentId) => {
  const docClient = createClient();
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: { ':pk': `STUDENT#${studentId}` },
    ScanIndexForward: false,
  }));
  return result.Items ?? [];
};
