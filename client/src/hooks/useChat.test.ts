import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useStartChatConversation } from './useChat'
import { loginAs } from '@/test/session'
import { createWrapper } from '@/test/createWrapper'
import { server } from '@/mocks/server'
import type { ChatConversation } from '@/types/api'

function makeConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: 'conv-1',
    name: null,
    members: ['student-1', 'coach-1'],
    frozen: false,
    lastMessageAt: null,
    image: null,
    lastMessage: null,
    ...overrides,
  }
}

describe('useStartChatConversation', () => {
  it('cria e retorna a conversa sem atualizar o nome quando não é fornecido', async () => {
    loginAs('client')
    const conv = makeConversation({ id: 'conv-new' })
    server.use(
      http.post('*/student/chat/conversations', () => HttpResponse.json(conv)),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStartChatConversation('client'), { wrapper })

    result.current.mutate({ peerId: 'coach-1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('conv-new')
  })

  it('atualiza o nome quando a conversa retorna com nome diferente', async () => {
    loginAs('client')
    const conv = makeConversation({ id: 'conv-2', name: null })
    const updated = makeConversation({ id: 'conv-2', name: 'Carlos Coach' })
    server.use(
      http.post('*/student/chat/conversations', () => HttpResponse.json(conv)),
      http.patch('*/student/chat/conversations/:id', () => HttpResponse.json(updated)),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStartChatConversation('client'), { wrapper })

    result.current.mutate({ peerId: 'coach-1', name: 'Carlos Coach' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.name).toBe('Carlos Coach')
  })

  it('retorna a conversa original quando a atualização de nome falha', async () => {
    loginAs('client')
    const conv = makeConversation({ id: 'conv-3', name: null })
    server.use(
      http.post('*/student/chat/conversations', () => HttpResponse.json(conv)),
      http.patch('*/student/chat/conversations/:id', () =>
        HttpResponse.json({ errors: ['erro'] }, { status: 500 }),
      ),
    )
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useStartChatConversation('client'), { wrapper })

    result.current.mutate({ peerId: 'coach-1', name: 'Novo Nome' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Retorna a conversa original (sem o nome atualizado).
    expect(result.current.data?.id).toBe('conv-3')
  })
})
