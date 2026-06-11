import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

/**
 * Persiste um novo coach na tabela DynamoDB.
 * @param {object} coach - Item completo a ser inserido.
 */
export const insertCoach = async (coach) => {
  const docClient = createClient();
  await docClient.send(new PutCommand({ TableName: TABLE, Item: coach }));
};
