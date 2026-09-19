import { listGyms as fetchGyms } from './repository.js';

const decodeCursor = (cursor) => {
  if (!cursor) return 0;
  const offset = Number(Buffer.from(cursor, 'base64').toString('utf8'));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
};

const encodeCursor = (offset) => Buffer.from(String(offset), 'utf8').toString('base64');

const matchesSearch = (gym, term) =>
  !term ||
  String(gym.name ?? '').toLowerCase().includes(term) ||
  String(gym.neighborhood ?? '').toLowerCase().includes(term) ||
  String(gym.city ?? '').toLowerCase().includes(term);

const matchesCity = (gym, city) => !city || String(gym.city ?? '').toLowerCase() === city;

/**
 * Recupera academias cadastradas, filtradas por nome/bairro/cidade (`search`) e/ou
 * cidade exata (`city`), paginadas por cursor.
 *
 * @param {object} [options]
 * @param {string} [options.search]    - Filtro por nome, bairro ou cidade (case-insensitive).
 * @param {string} [options.city]      - Filtro exato por cidade (case-insensitive).
 * @param {number} [options.limit=20]  - Máximo de itens por página.
 * @param {string} [options.cursor]    - Token de paginação da página anterior.
 * @returns {{ items: object[], nextCursor: string|null }}
 */
export const listGyms = async ({ search = '', city = '', limit = 20, cursor } = {}) => {
  const term = search.trim().toLowerCase();
  const cityFilter = city.trim().toLowerCase();

  const allGyms = await fetchGyms();
  const filtered = allGyms.filter(
    (gym) => matchesSearch(gym, term) && matchesCity(gym, cityFilter),
  );

  const start = decodeCursor(cursor);
  const items = filtered.slice(start, start + limit);
  const nextOffset = start + limit;

  return {
    items,
    nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : null,
  };
};
