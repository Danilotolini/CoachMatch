import { scanCoaches } from "./repository.js";

export async function listCoaches({ q, specialties, limit, lastKey }) {
  const { items, lastKey: nextKey } = await scanCoaches({ q, specialties, limit, lastKey });

  return {
    data: items,
    meta: {
      limit,
      lastKey: nextKey,
    },
  };
}