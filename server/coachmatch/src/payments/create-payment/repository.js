import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'payments';

/**
 * Constrói o item DynamoDB com chaves primária e GSIs.
 *
 * Padrões de acesso:
 *   PK = TRANSACTION#<id>   SK = METADATA         → busca por ID
 *   GSI1PK = COACH#<id>     GSI1SK = TRANSACTION#<date> → histórico do coach
 *   GSI2PK = STUDENT#<id>   GSI2SK = TRANSACTION#<date> → histórico do aluno
 *   GSI3PK = SESSION#<id>   GSI3SK = TRANSACTION#<id>   → transações da sessão
 */
const buildItem = (transaction) => ({
  PK:     `TRANSACTION#${transaction.transactionId}`,
  SK:     'METADATA',
  GSI1PK: `COACH#${transaction.coachId}`,
  GSI1SK: `TRANSACTION#${transaction.createdAt}`,
  GSI2PK: `STUDENT#${transaction.studentId}`,
  GSI2SK: `TRANSACTION#${transaction.createdAt}`,
  GSI3PK: `SESSION#${transaction.sessionId}`,
  GSI3SK: `TRANSACTION#${transaction.transactionId}`,
  ...transaction,
  updatedAt: new Date().toISOString(),
});

/**
 * Persiste uma nova transação no DynamoDB.
 * @param {object} transaction
 */
export const persistPayment = async (transaction) => {
  const docClient = createClient();
  const item = buildItem(transaction);
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
};
