import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'payments';

/**
 * Busca uma transação pelo ID.
 * @param {string} transactionId
 * @returns {object|null}
 */
export const findPaymentById = async (transactionId) => {
  const docClient = createClient();
  const result = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
  }));
  return result.Item ?? null;
};
