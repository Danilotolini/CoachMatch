import { useState } from 'react'
import { fetchAddressByCep } from '@/api/viacep'
import { useEstados, useMunicipios } from '@/hooks/useIbgeLocalidades'
import { useSuggestGym } from '@/hooks/useGyms'
import { CityAutocomplete, SelectField } from './LocationFields'
import type { Gym } from '@/types/api'

interface GymSuggestFormProps {
  onSuggested: (gym: Gym) => void
  onCancel: () => void
}

export function GymSuggestForm({ onSuggested, onCancel }: GymSuggestFormProps) {
  const [name, setName] = useState('')
  const [cep, setCep] = useState('')
  const [uf, setUf] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [cityKey, setCityKey] = useState(0)
  const [address, setAddress] = useState('')
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const estadosQuery = useEstados()
  const municipiosQuery = useMunicipios(uf || null)
  const suggest = useSuggestGym()

  const estadoOptions = (estadosQuery.data ?? []).map((e) => ({
    value: e.sigla,
    label: `${e.nome} (${e.sigla})`,
  }))
  const hasSelectedUfOption = !uf || estadoOptions.some((option) => option.value === uf)
  const estadoOptionsWithFallback = hasSelectedUfOption
    ? estadoOptions
    : [{ value: uf, label: uf }, ...estadoOptions]

  const cityDisabled = !uf || municipiosQuery.isLoading
  const canSubmit = !!name.trim() && !!uf && !!city.trim() && !!neighborhood && !!address.trim()

  const errorMessage = suggest.isError
    ? 'Não foi possível enviar a sugestão. Tente novamente.'
    : null

  const handleStateChange = (value: string) => {
    setUf(value)
    setCity('')
    setNeighborhood('')
    setAddress('')
    setCep('')
    setCepStatus('idle')
    setCityKey((key) => key + 1)
  }

  const handleCityChange = (value: string) => {
    setCity(value)
    setNeighborhood('')
    setAddress('')
  }

  const formatCep = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 5) return digits
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  const handleCepChange = async (raw: string) => {
    const nextCep = formatCep(raw)
    setCep(nextCep)
    setUf('')
    setCity('')
    setNeighborhood('')
    setAddress('')
    setCityKey((key) => key + 1)

    if (nextCep.replace(/\D/g, '').length !== 8) {
      setCepStatus('idle')
      return
    }

    setCepStatus('loading')
    try {
      const foundAddress = await fetchAddressByCep(nextCep)
      if (!foundAddress) {
        setCepStatus('error')
        return
      }

      setUf(foundAddress.uf)
      setCity(foundAddress.localidade)
      setNeighborhood(foundAddress.bairro)
      setAddress(foundAddress.logradouro)
      setCityKey((key) => key + 1)
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    setSuccessMessage(null)
    suggest.mutate(
      { name, address, city, state: uf, neighborhood, coordinates: null },
      {
        onSuccess: (response) => {
          if (response.data) {
            onSuggested(response.data)
            return
          }
          setSuccessMessage(response.message)
        },
      },
    )
  }

  return (
    <div className="bg-surface-container-low/50 border border-dashed border-outline-variant/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
          Sugerir nova academia
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={suggest.isPending}
          className="text-on-surface-variant hover:text-error transition-colors disabled:opacity-40"
          aria-label="Cancelar sugestão"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <label className="block">
        <span className="block font-label text-xs text-on-surface-variant mb-2">
          Nome da academia
        </span>
        <input
          type="text"
          value={name}
          placeholder="Ex.: Smart Fit Boa Viagem"
          onChange={(e) => {
            setName(e.target.value)
          }}
          className="w-full bg-surface-container-highest rounded-lg border border-outline-variant/15 focus:border-primary/50 px-4 py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none transition-colors placeholder-on-surface-variant/50"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-[160px_160px_minmax(0,1fr)] gap-3">
        <label className="block">
          <span className="block font-label text-xs text-on-surface-variant mb-2">CEP</span>
          <input
            type="text"
            inputMode="numeric"
            value={cep}
            placeholder="00000-000"
            onChange={(e) => {
              void handleCepChange(e.target.value)
            }}
            className="w-full bg-surface-container-highest rounded-lg border border-outline-variant/15 focus:border-primary/50 px-4 py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none transition-colors placeholder-on-surface-variant/50"
          />
          {cepStatus === 'loading' ? (
            <span className="mt-1 block font-body text-xs text-on-surface-variant">
              Buscando endereço...
            </span>
          ) : null}
          {cepStatus === 'error' ? (
            <span className="mt-1 block font-body text-xs text-error">
              Não encontramos esse CEP.
            </span>
          ) : null}
        </label>
        <SelectField
          label="Estado"
          value={uf}
          onChange={handleStateChange}
          disabled={estadosQuery.isLoading}
          placeholder={estadosQuery.isLoading ? 'Carregando...' : 'Selecione'}
          options={estadoOptionsWithFallback}
        />
        <CityAutocomplete
          key={cityKey}
          value={city}
          onChange={handleCityChange}
          options={municipiosQuery.data.map((m) => m.nome)}
          disabled={cityDisabled}
          placeholder={
            !uf
              ? 'Selecione um estado primeiro'
              : municipiosQuery.isLoading
                ? 'Carregando municípios...'
                : 'Digite para buscar...'
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,0.8fr)_minmax(0,1.2fr)] gap-3">
        <label className="block">
          <span className="block font-label text-xs text-on-surface-variant mb-2">Bairro</span>
          <input
            type="text"
            value={neighborhood}
            placeholder="Ex.: Boa Viagem"
            onChange={(e) => {
              setNeighborhood(e.target.value)
            }}
            className="w-full bg-surface-container-highest rounded-lg border border-outline-variant/15 focus:border-primary/50 px-4 py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none transition-colors placeholder-on-surface-variant/50"
          />
        </label>

        <label className="block">
          <span className="block font-label text-xs text-on-surface-variant mb-2">
            Endereço (rua e número)
          </span>
          <input
            type="text"
            value={address}
            placeholder="Ex.: Av. Boa Viagem, 1000"
            onChange={(e) => {
              setAddress(e.target.value)
            }}
            className="w-full bg-surface-container-highest rounded-lg border border-outline-variant/15 focus:border-primary/50 px-4 py-3 font-body text-sm text-on-surface focus:ring-0 focus:outline-none transition-colors placeholder-on-surface-variant/50"
          />
        </label>
      </div>

      {errorMessage ? <p className="font-body text-xs text-error">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="font-body text-xs text-primary">
          {successMessage}. Ela ficará disponível após aprovação.
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit || suggest.isPending}
        onClick={handleSubmit}
        className="w-full bg-primary/10 text-primary font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {suggest.isPending ? 'ENVIANDO...' : 'ENVIAR SUGESTÃO'}
      </button>
    </div>
  )
}
