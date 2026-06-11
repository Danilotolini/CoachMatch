import { listGyms } from './index.js';

/**
 * Converte o item do DynamoDB para o shape Gym do front-end.
 * Renomeia gymId → id conforme esperado pelo cliente.
 *
 * @param {object} gym - Item bruto do DynamoDB.
 * @returns {object}
 */
const mapGym = ({ gymId, ...rest }) => ({ id: gymId, ...rest });

/**
 * Handler HTTP: GET /gyms
 * Retorna a lista paginada de academias com cursor-based pagination.
 */
export const handler = async (event) => {
  const params = event?.queryStringParameters ?? {};
  const limit  = params.limit  ? Number(params.limit) : 20;
  const cursor = params.cursor ?? undefined;

  const result = await listGyms({ limit, cursor });

  return {
    statusCode: 200,
    body: JSON.stringify({
      items:      result.items.map(mapGym),
      nextCursor: result.nextCursor,
    }),
  };
};
