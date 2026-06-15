/** Prefixo "CREF" (com separadores opcionais) eventualmente colado no início. */
const CREF_PREFIX = /^\s*cref[\s:.\-/]*/i

/** Remove um prefixo "CREF" colado no início do valor (ex.: "CREF 012345-G/SP"). */
export function stripCrefPrefix(value: string): string {
  return value.replace(CREF_PREFIX, '')
}

/** Formata caracteres já normalizados ([0-9A-Z]) no padrão 000000-G/SP. */
function formatCref(normalized: string): string {
  let digits = ''
  let category = ''
  let state = ''
  for (const ch of normalized) {
    if (digits.length < 6 && ch >= '0' && ch <= '9') digits += ch
    else if (!category && (ch === 'G' || ch === 'P')) category = ch
    else if (category && state.length < 2 && ch >= 'A' && ch <= 'Z') state += ch
  }
  let result = digits
  if (category) result += `-${category}`
  if (state) result += `/${state}`
  return result
}

/**
 * Aplica a máscara de CREF (000000-G/SP), inserindo "-" e "/" automaticamente e
 * removendo um eventual prefixo "CREF" colado no início.
 *
 * `previous` é o valor mascarado anterior, usado para apagar o conteúdo junto
 * quando o usuário remove apenas um separador — sem ele o formatador re-inseriria
 * o separador e a tecla não teria efeito.
 */
export function maskCref(value: string, previous = ''): string {
  const stripped = stripCrefPrefix(value)
  let normalized = stripped.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const previousClean = previous.replace(/[^0-9A-Z]/g, '')

  if (stripped.length < previous.length && normalized === previousClean) {
    let i = 0
    while (i < stripped.length && stripped[i] === previous[i]) i++
    const cleanIdx = stripped.slice(0, i).replace(/[^0-9A-Z]/g, '').length - 1
    if (cleanIdx >= 0) {
      normalized = normalized.slice(0, cleanIdx) + normalized.slice(cleanIdx + 1)
    }
  }

  return formatCref(normalized)
}
