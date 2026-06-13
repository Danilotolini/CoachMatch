import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

/**
 * Persiste um novo coach na tabela DynamoDB.
 * Timestamps createdAt e updatedAt são gerados aqui para garantir consistência.
 *
 * @param {object} coach - Dados do coach sem timestamps.
 */
export const insertCoach = async (coach) => {
  const docClient = createClient();
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: { ...coach, createdAt: now, updatedAt: now },
    })
  );
};
