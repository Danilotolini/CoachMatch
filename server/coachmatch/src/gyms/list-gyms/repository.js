import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'gyms';

/**
 * Scan completo da tabela. Aceitável aqui porque a lista de academias é
 * pequena (dezenas de itens); busca e paginação acontecem em memória.
 */
export const listGyms = async () => {
  const docClient = createClient();
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await docClient.send(
      new ScanCommand({ TableName: TABLE, ExclusiveStartKey: exclusiveStartKey }),
    );
    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
};
