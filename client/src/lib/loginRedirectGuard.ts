import type { Role } from '@/stores/sessionStore'

// Guard em escopo de módulo: sobrevive a remounts do LoginPage dentro da mesma
// carga de página (um useRef nasceria zerado a cada montagem) e reseta sozinho
// quando o browser navega de fato. Em teste, o reset é manual no setup global.
const dispatched = new Set<Role>()

// Marca o papel e devolve `true` só na primeira vez; remount e double-invoke do
// StrictMode recebem `false` e não disparam um segundo getLoginUrl.
export function claimLoginRedirect(role: Role): boolean {
  if (dispatched.has(role)) return false
  dispatched.add(role)
  return true
}

export function releaseLoginRedirect(role: Role): void {
  dispatched.delete(role)
}

export function resetLoginRedirects(): void {
  dispatched.clear()
}
