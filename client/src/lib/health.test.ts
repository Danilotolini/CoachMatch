import { describe, expect, it } from 'vitest'
import { ageFromBirthDate } from './health'

describe('ageFromBirthDate', () => {
  it('retorna null para birthDate null', () => {
    expect(ageFromBirthDate(null)).toBeNull()
  })

  it('retorna null para string vazia', () => {
    expect(ageFromBirthDate('')).toBeNull()
  })

  it('retorna null para data inválida', () => {
    expect(ageFromBirthDate('não-é-data')).toBeNull()
  })

  it('calcula a idade corretamente quando o aniversário já passou este ano', () => {
    const birthDate = `${new Date().getFullYear() - 25}-01-01`
    const age = ageFromBirthDate(birthDate)
    expect(age).toBe(25)
  })

  it('calcula a idade corretamente quando o aniversário ainda não chegou este ano', () => {
    const thisYear = new Date().getFullYear()
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const birthDate = `${thisYear - 30}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
    const age = ageFromBirthDate(birthDate)
    expect(age).toBe(29)
  })
})
