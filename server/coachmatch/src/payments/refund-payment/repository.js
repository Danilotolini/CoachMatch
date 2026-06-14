import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { PaymentAlreadyRefundedException } from '../shared/exceptions.js';

const TABLE = 'payments';

export const findPaymentById = async (transactionId) => {
  const docClient = createClient();
  const result = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
  }));
  return result.Item ?? null;
};

export const markAsRefunded = async (transactionId, refundData) => {
  const docClient = createClient();
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `TRANSACTION#${transactionId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, refundData = :refundData',
      ConditionExpression: '#status = :approved',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status':    'refunded',
        ':updatedAt': new Date().toISOString(),
        ':refundData': refundData,
        ':approved':  'approved',
      },
    }));
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new PaymentAlreadyRefundedException(transactionId);
    }
    throw err;
  }
};
