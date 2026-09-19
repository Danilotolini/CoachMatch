/**
 * Comparador de ordenação por uma chave string, em ordem de code point — a mesma
 * que `Array.prototype.sort()` aplica por padrão a strings soltas.
 *
 * Deliberadamente não usa `localeCompare`: com ele, labels acentuadas mudariam de
 * posição em relação à ordem que o catálogo e a agenda já expõem hoje.
 *
 * @param {(item: any) => string} getKey extrai a chave de ordenação do item.
 */
export const byStringKey = (getKey) => (a, b) => {
  const ka = getKey(a) ?? '';
  const kb = getKey(b) ?? '';
  if (ka < kb) return -1;
  if (ka > kb) return 1;
  return 0;
};
