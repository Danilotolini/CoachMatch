export interface IbgeEstado {
  id: number
  sigla: string
  nome: string
}

interface IbgeMunicipioRaw {
  id: number
  nome: string
  microrregiao?: {
    mesorregiao?: {
      UF?: { sigla?: string }
    }
  }
  // alguns endpoints já retornam regiao-imediata; mantemos genérico
  'regiao-imediata'?: {
    'regiao-intermediaria'?: {
      UF?: { sigla?: string }
    }
  }
}

export interface IbgeMunicipio {
  id: number
  nome: string
  uf: string
}

const BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`IBGE ${String(res.status)}`)
  return (await res.json()) as T
}

export async function fetchEstados(): Promise<IbgeEstado[]> {
  return fetchJson<IbgeEstado[]>(`${BASE}/estados?orderBy=nome`)
}

export async function fetchMunicipios(): Promise<IbgeMunicipio[]> {
  const raw = await fetchJson<IbgeMunicipioRaw[]>(`${BASE}/municipios?orderBy=nome`)
  return raw.map((m) => ({
    id: m.id,
    nome: m.nome,
    uf:
      m.microrregiao?.mesorregiao?.UF?.sigla ??
      m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ??
      '',
  }))
}
