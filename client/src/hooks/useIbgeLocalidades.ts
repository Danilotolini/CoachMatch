import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchEstados, fetchMunicipios, type IbgeMunicipio } from '@/api/ibge'

const ONE_DAY = 24 * 60 * 60 * 1000

export function useEstados() {
  return useQuery({
    queryKey: ['ibge', 'estados'],
    queryFn: fetchEstados,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}

export function useMunicipios(uf: string | null) {
  const query = useQuery({
    queryKey: ['ibge', 'municipios'],
    queryFn: fetchMunicipios,
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
    enabled: !!uf,
  })

  const filtered = useMemo<IbgeMunicipio[]>(() => {
    if (!uf || !query.data) return []
    return query.data.filter((m) => m.uf === uf)
  }, [uf, query.data])

  return { ...query, data: filtered }
}
