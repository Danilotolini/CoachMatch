import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))

vi.mock('../../../shared/config.js', () => ({
  createClient: () => ({ send: sendMock }),
}))

vi.mock('../../../shared/s3.js', () => ({
  signGetUrl: vi.fn(async (key) => (key ? `https://signed.example/${key}` : null)),
}))

import { resolveMemberImages } from '../profiles.js'
import { signGetUrl } from '../../../shared/s3.js'

beforeEach(() => {
  vi.clearAllMocks()
})

function makeBatchGetResponse(table, items) {
  return { Responses: { [table]: items } }
}

describe('resolveMemberImages', () => {
  it('retorna Map vazio quando a lista de ids está vazia', async () => {
    const result = await resolveMemberImages([])
    expect(result.size).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('retorna Map vazio quando a lista contém apenas valores falsy', async () => {
    const result = await resolveMemberImages([null, undefined, ''])
    expect(result.size).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('desduplicata os ids antes de consultar', async () => {
    sendMock.mockResolvedValue(makeBatchGetResponse('student', []))
    await resolveMemberImages(['u1', 'u1', 'u1'])
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('retorna URL assinada para foto de aluno', async () => {
    sendMock
      .mockResolvedValueOnce(
        makeBatchGetResponse('student', [{ studentId: 'u1', photo_key: 'photos/u1.jpg' }]),
      )
      .mockResolvedValueOnce(makeBatchGetResponse('coaches', []))
    const result = await resolveMemberImages(['u1'])
    expect(result.get('u1')).toBe('https://signed.example/photos/u1.jpg')
    expect(signGetUrl).toHaveBeenCalledWith('photos/u1.jpg')
  })

  it('retorna URL assinada para foto de treinador', async () => {
    sendMock
      .mockResolvedValueOnce(makeBatchGetResponse('student', []))
      .mockResolvedValueOnce(
        makeBatchGetResponse('coaches', [
          { coachId: 'c1', profile: { photo_key: 'coaches/c1.jpg' } },
        ]),
      )
    const result = await resolveMemberImages(['c1'])
    expect(result.get('c1')).toBe('https://signed.example/coaches/c1.jpg')
    expect(signGetUrl).toHaveBeenCalledWith('coaches/c1.jpg')
  })

  it('ignora registros sem photo_key', async () => {
    sendMock
      .mockResolvedValueOnce(makeBatchGetResponse('student', [{ studentId: 'u2' }]))
      .mockResolvedValueOnce(makeBatchGetResponse('coaches', []))
    const result = await resolveMemberImages(['u2'])
    expect(result.size).toBe(0)
    expect(signGetUrl).not.toHaveBeenCalled()
  })

  it('coach sem profile não causa erro', async () => {
    sendMock
      .mockResolvedValueOnce(makeBatchGetResponse('student', []))
      .mockResolvedValueOnce(makeBatchGetResponse('coaches', [{ coachId: 'c2' }]))
    const result = await resolveMemberImages(['c2'])
    expect(result.size).toBe(0)
  })

  it('processa ids em lotes de 100', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `u${i}`)
    sendMock.mockResolvedValue(makeBatchGetResponse('student', []))
    await resolveMemberImages(ids)
    expect(sendMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
