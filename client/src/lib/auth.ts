export function getToken(): string | null {
  return localStorage.getItem('idToken')
}
