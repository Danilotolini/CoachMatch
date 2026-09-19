import { scanAllSpecialties } from './repository.js';
import { HttpError } from '../../shared/http.js';
import { byStringKey } from '../../shared/compare.js';

const MAX_LIMIT = 100;

/**
 * Converte um parâmetro de paginação em inteiro, com piso em 1.
 * Ausente ou vazio usa o default; qualquer outra coisa que não seja inteiro
 * (`'abc'`, `'1.5'`) lança 400 — um `limit` mal formado é erro do cliente, não
 * algo a arredondar em silêncio.
 */
const parseIntParam = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(String(value).trim());
  if (!Number.isInteger(n)) {
    throw new HttpError(400, { error: "Os parâmetros 'limit' e 'page' devem ser inteiros." });
  }
  return Math.max(1, n);
};

/**
 * Lista specialties com busca (label/id, case-insensitive) e paginação em memória.
 *
 * @param {{ search?: string, limit?: string|number, page?: string|number }} params
 */
export const listSpecialties = async (params = {}) => {
  const search = String(params.search ?? '').trim().toLowerCase();
  const limit = Math.min(MAX_LIMIT, parseIntParam(params.limit, MAX_LIMIT));
  const page = parseIntParam(params.page, 1);

  let items = await scanAllSpecialties();

  if (search) {
    items = items.filter((item) =>
      String(item.label ?? '').toLowerCase().includes(search) ||
      String(item.id ?? '').toLowerCase().includes(search)
    );
  }

  items = items.toSorted(byStringKey((item) => String(item.label ?? '')));

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;

  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
