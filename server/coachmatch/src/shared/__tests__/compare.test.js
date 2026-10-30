import { describe, expect, it } from 'vitest'
import { byStringKey } from '../compare.js'

describe('byStringKey', () => {
  it('ordena itens pela chave em ordem crescente de code point', () => {
    const items = [
      { label: 'Yoga' },
      { label: 'Musculação' },
      { label: 'Corrida' },
    ]
    const sorted = [...items].sort(byStringKey((item) => item.label))
    expect(sorted.map((i) => i.label)).toEqual(['Corrida', 'Musculação', 'Yoga'])
  })

  it('retorna 0 quando as chaves são iguais', () => {
    const comparator = byStringKey((item) => item.label)
    expect(comparator({ label: 'A' }, { label: 'A' })).toBe(0)
  })

  it('retorna -1 quando a chave do primeiro é menor', () => {
    const comparator = byStringKey((item) => item.label)
    expect(comparator({ label: 'A' }, { label: 'B' })).toBe(-1)
  })

  it('retorna 1 quando a chave do primeiro é maior', () => {
    const comparator = byStringKey((item) => item.label)
    expect(comparator({ label: 'B' }, { label: 'A' })).toBe(1)
  })

  it('trata null/undefined na chave como string vazia', () => {
    const comparator = byStringKey((item) => item.label)
    expect(comparator({ label: null }, { label: 'A' })).toBe(-1)
    expect(comparator({ label: 'A' }, { label: null })).toBe(1)
    expect(comparator({ label: null }, { label: null })).toBe(0)
  })
})
