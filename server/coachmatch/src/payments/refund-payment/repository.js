import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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

/**
 * Atualiza o status de uma transação para 'refunded' e registra os dados do estorno.
 * @param {string} transactionId
 * @param {object} refundData - { refundId, refundedAt, reason }
 */
export const markAsRefunded = async (transactionId, refundData) => {
  const docClient = createClient();
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, refundData = :refundData',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status':    'refunded',
      ':updatedAt': new Date().toISOString(),
      ':refundData': refundData,
    },
  }));
};
