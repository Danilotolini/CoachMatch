import { listGyms as fetchGyms } from './repository.js';

/**
 * Recupera a lista paginada de academias cadastradas.
 *
 * @param {object} [options]
 * @param {number} [options.limit=20]  - Máximo de itens por página.
 * @param {string} [options.cursor]    - Token de paginação da página anterior.
 * @returns {{ items: object[], nextCursor: string|null }}
 */
export const listGyms = async ({ limit = 20, cursor } = {}) => {
  return fetchGyms({ limit, cursor });
};
