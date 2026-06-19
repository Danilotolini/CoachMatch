export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function maskInstagram(value: string): string {
  return value
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

/** URL do perfil público no Instagram a partir de um handle (`@user` ou `user`). */
export function instagramUrl(value: string): string {
  return `https://instagram.com/${maskInstagram(value)}`
}
