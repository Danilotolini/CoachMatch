import { describe, expect, it } from 'vitest'
import { serializeStreamMessage } from './streamChat'

describe('serializeStreamMessage', () => {
  it('retorna null para mensagem null', () => {
    expect(serializeStreamMessage(null)).toBeNull()
  })

  it('retorna null para mensagem sem id', () => {
    expect(serializeStreamMessage({ text: 'oi' })).toBeNull()
  })

  it('serializa uma mensagem completa', () => {
    const result = serializeStreamMessage({
      id: 'm1',
      text: 'olá',
      user: { id: 'u1' },
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:01:00Z',
    })
    expect(result).toEqual({
      id: 'm1',
      text: 'olá',
      userId: 'u1',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:01:00Z',
      deletedAt: null,
    })
  })

  it('converte Date para ISO string', () => {
    const date = new Date('2026-06-15T08:00:00Z')
    const result = serializeStreamMessage({ id: 'm2', created_at: date })
    expect(result?.createdAt).toBe('2026-06-15T08:00:00.000Z')
  })

  it('usa string vazia quando text ausente', () => {
    const result = serializeStreamMessage({ id: 'm3' })
    expect(result?.text).toBe('')
  })

  it('usa string vazia quando user ausente', () => {
    const result = serializeStreamMessage({ id: 'm4' })
    expect(result?.userId).toBe('')
  })

  it('inclui deletedAt quando presente', () => {
    const result = serializeStreamMessage({
      id: 'm5',
      deleted_at: '2026-01-02T00:00:00Z',
    })
    expect(result?.deletedAt).toBe('2026-01-02T00:00:00Z')
  })

  it('não inclui createdAt quando ausente', () => {
    const result = serializeStreamMessage({ id: 'm6' })
    expect('createdAt' in (result ?? {})).toBe(false)
  })
})
