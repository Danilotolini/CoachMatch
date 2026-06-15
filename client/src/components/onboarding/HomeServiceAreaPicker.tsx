import { useMemo, useState } from 'react'
import { useEstados, useMunicipios } from '@/hooks/useIbgeLocalidades'
import { useViaCepBairros } from '@/hooks/useViaCepBairros'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { CityAutocomplete, SelectField } from './LocationFields'

export function HomeServiceAreaPicker() {
  const homeAreas = useOnboardingStore((s) => s.form.homeAreas)
  const addHomeArea = useOnboardingStore((s) => s.addHomeArea)
  const removeHomeArea = useOnboardingStore((s) => s.removeHomeArea)

  const [draftState, setDraftState] = useState('')
  const [draftCity, setDraftCity] = useState('')
  const [draftNeighborhoods, setDraftNeighborhoods] = useState<string[]>([])
  const [logradouro, setLogradouro] = useState('')
  const [draftKey, setDraftKey] = useState(0)

  const estadosQuery = useEstados()
  const municipiosQuery = useMunicipios(draftState || null)
  const viaCepQuery = useViaCepBairros(draftState || null, draftCity || null, logradouro)

  const bairrosSugeridos = useMemo(() => {
    const data = viaCepQuery.data ?? []
    const set = new Set<string>()
    for (const item of data) {
      if (item.bairro) set.add(item.bairro)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [viaCepQuery.data])

  const cityDisabled = !draftState || municipiosQuery.isLoading
  const showSearchHint = logradouro.trim().length > 0 && logradouro.trim().length < 3

  const canAdd = !!draftState && !!draftCity && draftNeighborhoods.length > 0
  const isDuplicate = homeAreas.some((area) => area.state === draftState && area.city === draftCity)

  const resetDraft = () => {
    setDraftState('')
    setDraftCity('')
    setDraftNeighborhoods([])
    setLogradouro('')
    setDraftKey((k) => k + 1)
  }

  const handleStateChange = (uf: string) => {
    setDraftState(uf)
    setDraftCity('')
    setDraftNeighborhoods([])
    setLogradouro('')
    setDraftKey((k) => k + 1)
  }

  const handleCityChange = (city: string) => {
    setDraftCity(city)
    setDraftNeighborhoods([])
    setLogradouro('')
  }

  const toggleDraftNeighborhood = (bairro: string) => {
    setDraftNeighborhoods((prev) =>
      prev.includes(bairro) ? prev.filter((n) => n !== bairro) : [...prev, bairro],
    )
  }

  const handleAdd = () => {
    if (!canAdd || isDuplicate) return
    addHomeArea({
      state: draftState,
      city: draftCity,
      neighborhoods: draftNeighborhoods,
    })
    resetDraft()
  }

  return (
    <div className="space-y-5">
      {homeAreas.length > 0 ? (
        <ul className="space-y-3">
          {homeAreas.map((area) => (
            <li
              key={area.id}
              className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-headline text-sm font-semibold text-on-surface">
                    {area.city} - {area.state}
                  </p>
                  <p className="font-body text-xs text-on-surface-variant">
                    {area.neighborhoods.length}{' '}
                    {area.neighborhoods.length === 1 ? 'bairro' : 'bairros'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeHomeArea(area.id)
                  }}
                  className="text-on-surface-variant hover:text-error transition-colors"
                  aria-label={`Remover área ${area.city}`}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {area.neighborhoods.map((bairro) => (
                  <span
                    key={bairro}
                    className="inline-flex items-center bg-surface-container-highest rounded-full py-1 px-3 gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-body text-xs text-on-surface">{bairro}</span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="bg-surface-container-low/50 border border-dashed border-outline-variant/30 rounded-xl p-4 space-y-4">
        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
          {homeAreas.length > 0 ? 'Adicionar outra área' : 'Nova área de atendimento'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SelectField
            label="Estado"
            value={draftState}
            onChange={handleStateChange}
            disabled={estadosQuery.isLoading}
            placeholder={estadosQuery.isLoading ? 'Carregando...' : 'Selecione'}
            options={(estadosQuery.data ?? []).map((e) => ({
              value: e.sigla,
              label: `${e.nome} (${e.sigla})`,
            }))}
          />
          <CityAutocomplete
            key={draftKey}
            value={draftCity}
            onChange={handleCityChange}
            options={municipiosQuery.data.map((m) => m.nome)}
            disabled={cityDisabled}
            placeholder={
              !draftState
                ? 'Selecione um estado primeiro'
                : municipiosQuery.isLoading
                  ? 'Carregando municípios...'
                  : 'Digite para buscar...'
            }
          />
        </div>

        {draftCity ? (
          <div className="space-y-3">
            <label className="block font-label text-xs text-on-surface-variant">
              Bairros de atendimento
            </label>
            <div className="bg-surface-container-highest rounded-full px-4 py-3 flex items-center border border-outline-variant/15 focus-within:border-primary/50 transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant mr-3">search</span>
              <input
                type="text"
                placeholder="Digite uma rua para descobrir bairros..."
                value={logradouro}
                onChange={(e) => {
                  setLogradouro(e.target.value)
                }}
                className="bg-transparent border-none w-full text-on-surface font-body text-sm focus:ring-0 focus:outline-none p-0 placeholder-on-surface-variant/50"
              />
            </div>
            {showSearchHint ? (
              <p className="font-body text-xs text-on-surface-variant">
                Digite ao menos 3 caracteres.
              </p>
            ) : null}
            {viaCepQuery.isFetching ? (
              <p className="font-body text-xs text-on-surface-variant">Buscando...</p>
            ) : null}
            {viaCepQuery.isError ? (
              <p className="font-body text-xs text-error">
                Não foi possível consultar os bairros agora.
              </p>
            ) : null}
            {bairrosSugeridos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {bairrosSugeridos.map((bairro) => {
                  const active = draftNeighborhoods.includes(bairro)
                  return (
                    <button
                      key={bairro}
                      type="button"
                      onClick={() => {
                        toggleDraftNeighborhood(bairro)
                      }}
                      className={`rounded-full px-3 py-1.5 font-body text-xs border transition-colors ${
                        active
                          ? 'bg-primary text-on-primary-fixed border-primary'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {bairro}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {draftNeighborhoods.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {draftNeighborhoods.map((bairro) => (
                  <span
                    key={bairro}
                    className="inline-flex items-center bg-surface-container-low border border-outline-variant/30 rounded-lg py-2 px-3 gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-body text-xs text-on-surface">{bairro}</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleDraftNeighborhood(bairro)
                      }}
                      className="text-on-surface-variant hover:text-error transition-colors ml-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {isDuplicate ? (
          <p className="font-body text-xs text-error">
            Já existe uma área para {draftCity} - {draftState}. Remova a antiga para editar.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!canAdd || isDuplicate}
          onClick={handleAdd}
          className="w-full bg-primary/10 text-primary font-headline font-bold text-xs uppercase tracking-widest py-3 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          ADICIONAR ÁREA
        </button>
      </div>
    </div>
  )
}
