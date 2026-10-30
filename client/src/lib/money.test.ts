import { describe, expect, it } from 'vitest'
import { formatMoney, paymentLabel } from './money'

describe('formatMoney', () => {
  it('formata número em BRL sem centavos', () => {
    expect(formatMoney(100)).toMatch(/100/)
    expect(formatMoney(100)).toMatch(/R\$/)
  })

  it('formata string numérica', () => {
    expect(formatMoney('250')).toMatch(/250/)
  })

  it('retorna o valor original quando não é número', () => {
    expect(formatMoney('invalido')).toBe('invalido')
  })
})

describe('paymentLabel', () => {
  it('retorna null para status null', () => {
    expect(paymentLabel(null)).toBeNull()
  })

  it('retorna "Pago" para PAID', () => {
    expect(paymentLabel('PAID')).toBe('Pago')
  })

  it('retorna "Pendente" para PENDING', () => {
    expect(paymentLabel('PENDING')).toBe('Pendente')
  })

  it('converte status desconhecido para minúsculo', () => {
    expect(paymentLabel('REFUNDED')).toBe('refunded')
  })
})
