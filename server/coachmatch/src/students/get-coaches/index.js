import { queryCoaches } from "./repository.js";

export async function listCoaches({ q, specialties, limit, lastKey }) {
  const { items, lastKey: nextKey } = await queryCoaches({ q, specialties, limit, lastKey });

  return {
    data: items,
    meta: {
      limit,
      lastKey: nextKey,
    },
  };
}