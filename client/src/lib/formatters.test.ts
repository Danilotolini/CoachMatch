import { describe, expect, it } from 'vitest'
import { instagramUrl, maskInstagram, maskPhone, onlyDigits } from './formatters'

describe('onlyDigits', () => {
  it('remove todos os caracteres não numéricos', () => {
    expect(onlyDigits('(11) 99999-9999')).toBe('11999999999')
  })

  it('retorna vazio para string sem dígitos', () => {
    expect(onlyDigits('abc')).toBe('')
  })
})

describe('maskPhone', () => {
  it('retorna apenas os dígitos quando há menos de 3', () => {
    expect(maskPhone('11')).toBe('11')
  })

  it('formata até 6 dígitos sem hífen', () => {
    expect(maskPhone('11 9999')).toBe('(11) 9999')
  })

  it('formata telefone fixo (10 dígitos)', () => {
    expect(maskPhone('1134567890')).toBe('(11) 3456-7890')
  })

  it('formata celular (11 dígitos)', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('limita a 11 dígitos', () => {
    expect(maskPhone('119876543210000')).toBe('(11) 98765-4321')
  })
})

describe('maskInstagram', () => {
  it('remove o @ inicial', () => {
    expect(maskInstagram('@coach')).toBe('coach')
  })

  it('converte para minúsculo', () => {
    expect(maskInstagram('CoachJoao')).toBe('coachjoao')
  })

  it('remove caracteres inválidos', () => {
    expect(maskInstagram('coach joao!')).toBe('coachjoao')
  })

  it('limita a 30 caracteres', () => {
    expect(maskInstagram('a'.repeat(40))).toHaveLength(30)
  })
})

describe('instagramUrl', () => {
  it('gera a URL correta a partir de um handle', () => {
    expect(instagramUrl('coachjoao')).toBe('https://instagram.com/coachjoao')
  })

  it('normaliza o handle antes de montar a URL', () => {
    expect(instagramUrl('@CoachJoao')).toBe('https://instagram.com/coachjoao')
  })
})
