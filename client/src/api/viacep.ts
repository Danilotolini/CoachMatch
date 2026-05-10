export interface ViaCepAddress {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
}

export async function fetchViaCepAddresses(
  uf: string,
  city: string,
  logradouro: string,
): Promise<ViaCepAddress[]> {
  const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(logradouro)}/json/`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ViaCEP ${String(res.status)}`)
  const data = (await res.json()) as ViaCepAddress[] | { erro: true }
  if (Array.isArray(data)) return data
  return []
}
