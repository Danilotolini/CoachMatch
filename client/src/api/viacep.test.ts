import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fetchAddressByCep, fetchViaCepAddresses } from './viacep'
import { server } from '@/mocks/server'

describe('fetchAddressByCep', () => {
  it('retorna null quando CEP tem menos de 8 dígitos', async () => {
    const result = await fetchAddressByCep('1234-56')
    expect(result).toBeNull()
  })

  it('retorna null quando a API retorna { erro: true }', async () => {
    server.use(
      http.get('https://viacep.com.br/ws/:cep/json/', () =>
        HttpResponse.json({ erro: true }),
      ),
    )
    const result = await fetchAddressByCep('99999999')
    expect(result).toBeNull()
  })

  it('retorna o endereço quando a API responde com sucesso', async () => {
    server.use(
      http.get('https://viacep.com.br/ws/:cep/json/', () =>
        HttpResponse.json({
          cep: '01310-100',
          logradouro: 'Avenida Paulista',
          complemento: '',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP',
        }),
      ),
    )
    const result = await fetchAddressByCep('01310100')
    expect(result?.logradouro).toBe('Avenida Paulista')
    expect(result?.uf).toBe('SP')
  })

  it('lança erro quando a resposta HTTP não é ok', async () => {
    server.use(
      http.get('https://viacep.com.br/ws/:cep/json/', () =>
        HttpResponse.json({ message: 'not found' }, { status: 400 }),
      ),
    )
    await expect(fetchAddressByCep('00000000')).rejects.toThrow('ViaCEP 400')
  })
})

describe('fetchViaCepAddresses', () => {
  it('retorna lista de endereços quando a API responde com array', async () => {
    const result = await fetchViaCepAddresses('SP', 'São Paulo', 'Paulista')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].logradouro).toBeTruthy()
  })

  it('retorna array vazio quando a API retorna { erro: true }', async () => {
    server.use(
      http.get('https://viacep.com.br/ws/:uf/:city/:logradouro/json/', () =>
        HttpResponse.json({ erro: true }),
      ),
    )
    const result = await fetchViaCepAddresses('XX', 'Cidade', 'Rua')
    expect(result).toEqual([])
  })

  it('lança erro quando a resposta HTTP não é ok', async () => {
    server.use(
      http.get('https://viacep.com.br/ws/:uf/:city/:logradouro/json/', () =>
        HttpResponse.json({ message: 'server error' }, { status: 500 }),
      ),
    )
    await expect(fetchViaCepAddresses('SP', 'São Paulo', 'Rua')).rejects.toThrow('ViaCEP 500')
  })
})
