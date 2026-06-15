import { describe, expect, it } from 'vitest'
import { maskCref, stripCrefPrefix } from './cref'

describe('stripCrefPrefix', () => {
  it('remove o prefixo "CREF " do início', () => {
    expect(stripCrefPrefix('CREF 012345-G/SP')).toBe('012345-G/SP')
  })

  it('remove variações com dois-pontos, ponto e caixa', () => {
    expect(stripCrefPrefix('cref: 012345-G/SP')).toBe('012345-G/SP')
    expect(stripCrefPrefix('Cref.012345')).toBe('012345')
  })

  it('mantém o valor quando não há prefixo', () => {
    expect(stripCrefPrefix('012345-G/SP')).toBe('012345-G/SP')
  })
})

describe('maskCref', () => {
  it('insere "-" e "/" automaticamente conforme digita', () => {
    expect(maskCref('0')).toBe('0')
    expect(maskCref('012345')).toBe('012345')
    expect(maskCref('012345G')).toBe('012345-G')
    expect(maskCref('012345GS')).toBe('012345-G/S')
    expect(maskCref('012345GSP')).toBe('012345-G/SP')
  })

  it('normaliza caixa e descarta caracteres inválidos', () => {
    expect(maskCref('012345g/sp')).toBe('012345-G/SP')
    expect(maskCref('01 23 45 g sp')).toBe('012345-G/SP')
  })

  it('remove o prefixo "CREF" colado no início', () => {
    expect(maskCref('CREF 012345-G/SP')).toBe('012345-G/SP')
    expect(maskCref('CREF012345GSP')).toBe('012345-G/SP')
  })

  it('limita a 6 dígitos, 1 categoria e 2 letras de UF', () => {
    expect(maskCref('0123456789G/SPXYZ')).toBe('012345-G/SP')
  })

  it('apaga o conteúdo junto quando o usuário remove apenas o separador', () => {
    // "012345-G/SP" com o "-" apagado: remove o dígito anterior ("5"),
    // em vez de re-inserir o separador e ignorar a tecla.
    expect(maskCref('012345G/SP', '012345-G/SP')).toBe('01234-G/SP')
    // "012345-G/SP" com o "/" apagado: remove o caractere anterior ("G").
    expect(maskCref('012345-GSP', '012345-G/SP')).toBe('012345-P')
  })
})
