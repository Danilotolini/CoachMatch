import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'gyms';

/**
 * Lista academias com paginação via cursor (base64-encoded ExclusiveStartKey).
 *
 * @param {object} options
 * @param {number} [options.limit=20]  - Máximo de itens por página.
 * @param {string} [options.cursor]    - Token de paginação da página anterior.
 * @returns {{ items: object[], nextCursor: string|null }}
 */
export const listGyms = async ({ limit = 20, cursor } = {}) => {
  const docClient = createClient();

  const params = {
    TableName: TABLE,
    Limit: limit,
    ...(cursor && {
      ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')),
    }),
  };

  const result = await docClient.send(new ScanCommand(params));

  return {
    items: result.Items ?? [],
    nextCursor: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null,
  };
};
