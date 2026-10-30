import { describe, it, expect, vi } from 'vitest'
import { assertMembership, assertMessageAuthor } from '../membership.js'
import { ForbiddenError, NotFoundError } from '../errors.js'

function makeStream({ members = [], queryThrows = false, message = null, getMessageThrows = false } = {}) {
  return {
    channel: vi.fn().mockReturnValue({
      query: queryThrows
        ? vi.fn().mockRejectedValue(new Error('not found'))
        : vi.fn().mockResolvedValue({}),
      state: { members: Object.fromEntries(members.map((m) => [m, { user_id: m }])) },
    }),
    getMessage: getMessageThrows
      ? vi.fn().mockRejectedValue(new Error('not found'))
      : vi.fn().mockResolvedValue({ message }),
  }
}

describe('assertMembership', () => {
  it('retorna o canal quando o usuário é membro', async () => {
    const stream = makeStream({ members: ['u1', 'u2'] })
    const channel = await assertMembership(stream, 'chan-1', 'u1')
    expect(channel).toBeDefined()
  })

  it('lança NotFoundError quando a query do canal falha', async () => {
    const stream = makeStream({ queryThrows: true })
    await expect(assertMembership(stream, 'chan-1', 'u1')).rejects.toThrow(NotFoundError)
  })

  it('lança ForbiddenError quando o usuário não é membro', async () => {
    const stream = makeStream({ members: ['u2', 'u3'] })
    await expect(assertMembership(stream, 'chan-1', 'u1')).rejects.toThrow(ForbiddenError)
  })
})

describe('assertMessageAuthor', () => {
  it('retorna a mensagem quando o usuário é o autor', async () => {
    const msg = { id: 'm1', user: { id: 'u1' } }
    const stream = makeStream({ message: msg })
    const result = await assertMessageAuthor(stream, 'm1', 'u1')
    expect(result.id).toBe('m1')
  })

  it('lança NotFoundError quando getMessage lança', async () => {
    const stream = makeStream({ getMessageThrows: true })
    await expect(assertMessageAuthor(stream, 'm1', 'u1')).rejects.toThrow(NotFoundError)
  })

  it('lança NotFoundError quando getMessage retorna mensagem nula', async () => {
    const stream = makeStream({ message: null })
    await expect(assertMessageAuthor(stream, 'm1', 'u1')).rejects.toThrow(NotFoundError)
  })

  it('lança ForbiddenError quando o usuário não é o autor', async () => {
    const msg = { id: 'm1', user: { id: 'u2' } }
    const stream = makeStream({ message: msg })
    await expect(assertMessageAuthor(stream, 'm1', 'u1')).rejects.toThrow(ForbiddenError)
  })
})
