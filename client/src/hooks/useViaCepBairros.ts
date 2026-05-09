import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchViaCepAddresses } from '@/api/viacep'

const FIVE_MINUTES = 5 * 60 * 1000
const DEBOUNCE_MS = 400

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(value)
    }, delay)
    return () => {
      clearTimeout(id)
    }
  }, [value, delay])
  return debounced
}

export function useViaCepBairros(uf: string | null, city: string | null, logradouro: string) {
  const debounced = useDebounced(logradouro.trim(), DEBOUNCE_MS)
  const enabled = !!uf && !!city && debounced.length >= 3

  return useQuery({
    queryKey: ['viacep', uf, city, debounced],
    queryFn: () => fetchViaCepAddresses(uf ?? '', city ?? '', debounced),
    enabled,
    staleTime: FIVE_MINUTES,
  })
}
