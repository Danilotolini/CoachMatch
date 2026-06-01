import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../gymPostHandler.js'

vi.mock('../service/service-gym.js', () => ({
  registerSuggest: vi.fn()
}))

describe('gymPostHandler', () => {
  let mockRegisterSuggest

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../service/service-gym.js')
    mockRegisterSuggest = vi.mocked(mod.registerSuggest)
  })

  it('deve chamar registerSuggest com o body do evento', async () => {
    const mockBody = {
      name: 'Academia XYZ',
      address: 'Rua A, 123',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Centro',
      coordinates: { lat: -23.5505, lng: -46.6333 }
    }

    const event = { body: mockBody }
    const result = await handler(event)

    expect(mockRegisterSuggest).toHaveBeenCalledWith(mockBody)
    expect(result).toEqual(mockBody)
  })

  it('deve lançar erro quando evento não tem body', async () => {
    const event = {}
    await expect(handler(event)).rejects.toThrow('Evento errado')
  })

  it('deve lançar erro quando evento.body é null', async () => {
    const event = { body: null }
    await expect(handler(event)).rejects.toThrow('Evento errado')
  })

  it('deve propagar erro de registerSuggest', async () => {
    const mockError = new Error('Validação falhou')
    mockRegisterSuggest.mockRejectedValue(mockError)

    const event = { body: { name: 'Academia' } }
    await expect(handler(event)).rejects.toThrow('Validação falhou')
  })
})
