import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'coaches';

/**
 * Busca um coach pelo ID no DynamoDB.
 * @param {string} coachId
 * @returns {object|null} Registro do coach ou null se não encontrado.
 */
export const findCoachById = async (coachId) => {
  const docClient = createClient();
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { coachId } })
  );
  return result.Item ?? null;
};
