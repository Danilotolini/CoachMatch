import { listGyms as fetchGyms } from './repository.js';

const decodeCursor = (cursor) => {
  if (!cursor) return 0;
  const offset = Number(Buffer.from(cursor, 'base64').toString('utf8'));
  return Number.isInteger(offset) && offset >= 0 ? offset : 0;
};

const encodeCursor = (offset) => Buffer.from(String(offset), 'utf8').toString('base64');

/**
 * Chave de comparação sem caixa nem acento: o cadastro é acentuado ("São
 * Paulo") e a busca digitada raramente é, então comparar direto erraria.
 */
const foldCase = (value) =>
  String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

const matchesSearch = (gym, term) =>
  !term ||
  foldCase(gym.name).includes(term) ||
  foldCase(gym.neighborhood).includes(term) ||
  foldCase(gym.city).includes(term);

const matchesCity = (gym, city) => !city || foldCase(gym.city) === city;

/**
 * O cursor é um offset absoluto, então um `limit` não-positivo devolveria o
 * mesmo cursor para sempre (scroll infinito no cliente) e `NaN` esvaziaria
 * todas as páginas — ambos viram o default.
 */
const normalizeLimit = (limit) => {
  const pageSize = Math.trunc(Number(limit));
  return pageSize > 0 ? pageSize : 20;
};

/**
 * Recupera academias cadastradas, filtradas por nome/bairro/cidade (`search`) e/ou
 * cidade exata (`city`), paginadas por cursor.
 *
 * @param {object} [options]
 * @param {string} [options.search]    - Filtro por nome, bairro ou cidade (ignora caixa e acento).
 * @param {string} [options.city]      - Filtro exato por cidade (ignora caixa e acento).
 * @param {number} [options.limit=20]  - Máximo de itens por página; valores inválidos caem no default.
 * @param {string} [options.cursor]    - Token de paginação da página anterior.
 * @returns {{ items: object[], nextCursor: string|null }}
 */
export const listGyms = async ({ search = '', city = '', limit, cursor } = {}) => {
  const term = foldCase(search);
  const cityFilter = foldCase(city);

  const allGyms = await fetchGyms();
  const filtered = allGyms.filter(
    (gym) => matchesSearch(gym, term) && matchesCity(gym, cityFilter),
  );

  const pageSize = normalizeLimit(limit);
  const start = decodeCursor(cursor);
  const items = filtered.slice(start, start + pageSize);
  const nextOffset = start + pageSize;

  return {
    items,
    nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : null,
  };
};
