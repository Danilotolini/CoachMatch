import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Executa uma Query/Scan seguindo `LastEvaluatedKey` até o fim.
 *
 * O DynamoDB corta a resposta em 1 MB VARRIDO — o corte acontece antes de
 * aplicar `FilterExpression`, então nem um filtro restritivo garante página
 * única. Ler só a primeira página devolve resultado parcial com status 200, sem
 * nenhum sinal de que faltou dado: a resposta simplesmente omite registros.
 */
const paginate = async (docClient, Command, params) => {
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await docClient.send(new Command({ ...params, ExclusiveStartKey: exclusiveStartKey }));
    items.push(...(result.Items ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
};

/** @returns {Promise<object[]>} todos os itens da Query, em todas as páginas. */
export const queryAll = (docClient, params) => paginate(docClient, QueryCommand, params);

/** @returns {Promise<object[]>} todos os itens do Scan, em todas as páginas. */
export const scanAll = (docClient, params) => paginate(docClient, ScanCommand, params);
