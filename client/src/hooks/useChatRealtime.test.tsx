import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useChatRealtime } from './useChat'
import { getChatToken } from '@/api/chat'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import type { ChatMessage } from '@/types/api'

type StreamHandler = (event: { message: unknown }) => void

const listeners: Record<string, StreamHandler> = {}

const channel = {
  state: {
    messages: [
      {
        id: 'm0',
        text: 'mensagem inicial',
        user: { id: 'peer' },
        created_at: '2026-06-18T10:00:00Z',
      },
    ],
  },
  watch: vi.fn().mockResolvedValue(undefined),
  stopWatching: vi.fn().mockResolvedValue(undefined),
  on: vi.fn((event: string, handler: StreamHandler) => {
    listeners[event] = handler
    return { unsubscribe: vi.fn() }
  }),
}

const client = { channel: vi.fn(() => channel) }

vi.mock('@/lib/streamChat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/streamChat')>()
  return {
    ...actual,
    getChatClient: vi.fn(async () => client),
  }
})

const messagesKey = ['chat', 'messages', 'client', 'dm_1'] as const

describe('useChatRealtime', () => {
  beforeEach(() => {
    for (const key of Object.keys(listeners)) delete listeners[key]
  })

  it('conecta, semeia o estado do canal e empurra mensagens novas pro cache', async () => {
    const { wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useChatRealtime('client', 'dm_1'), { wrapper })

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    expect(queryClient.getQueryData<ChatMessage[]>([...messagesKey])).toEqual([
      expect.objectContaining({ id: 'm0', text: 'mensagem inicial', userId: 'peer' }),
    ])

    act(() => {
      listeners['message.new']({
        message: { id: 'm1', text: 'olá', user: { id: 'me' }, created_at: '2026-06-18T10:01:00Z' },
      })
    })

    expect(queryClient.getQueryData<ChatMessage[]>([...messagesKey])).toEqual([
      expect.objectContaining({ id: 'm0' }),
      expect.objectContaining({ id: 'm1', text: 'olá', userId: 'me' }),
    ])
  })

  it('faz dedup por id quando a mesma mensagem chega de novo (editada)', async () => {
    const { wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useChatRealtime('client', 'dm_1'), { wrapper })

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })

    act(() => {
      listeners['message.new']({
        message: { id: 'm9', text: 'oi', user: { id: 'me' }, created_at: '2026-06-18T10:02:00Z' },
      })
      listeners['message.updated']({
        message: {
          id: 'm9',
          text: 'oi (editado)',
          user: { id: 'me' },
          created_at: '2026-06-18T10:02:00Z',
        },
      })
    })

    const list = queryClient.getQueryData<ChatMessage[]>([...messagesKey]) ?? []
    expect(list.filter((m) => m.id === 'm9')).toHaveLength(1)
    expect(list.find((m) => m.id === 'm9')?.text).toBe('oi (editado)')
  })
})

describe('getChatToken', () => {
  it('emite o token do Stream para o papel', async () => {
    loginAs('client')
    const token = await getChatToken('client')
    expect(token.apiKey).toBe('stream_test_key')
    expect(token.token).toMatch(/^stream-token-/)
  })
})
