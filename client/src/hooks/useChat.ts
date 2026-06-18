import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createChatConversation,
  listChatConversations,
  listChatMessages,
  sendChatMessage,
  updateChatConversation,
} from '@/api/chat'
import type { Channel } from 'stream-chat'
import { getChatClient, serializeStreamMessage } from '@/lib/streamChat'
import type { Role } from '@/stores/sessionStore'
import type { ChatMessage } from '@/types/api'

const CONVERSATIONS_REFETCH_MS = 15 * 1000
const MESSAGES_REFETCH_MS = 5 * 1000

function conversationsKey(role: Role) {
  return ['chat', 'conversations', role] as const
}

function messagesKey(role: Role, conversationId: string | null) {
  return ['chat', 'messages', role, conversationId] as const
}

export function useChatConversations(role: Role) {
  return useQuery({
    queryKey: conversationsKey(role),
    queryFn: () => listChatConversations(role),
    refetchInterval: CONVERSATIONS_REFETCH_MS,
    staleTime: 5 * 1000,
  })
}

export function useChatMessages(
  role: Role,
  conversationId: string | null,
  options?: { realtime?: boolean },
) {
  return useQuery({
    queryKey: messagesKey(role, conversationId),
    queryFn: () => listChatMessages(role, conversationId ?? ''),
    enabled: !!conversationId,
    // Com a thread conectada ao Stream, as mensagens novas chegam por evento; o
    // polling vira só fallback de quando a conexão direta não está disponível.
    refetchInterval: options?.realtime ? false : MESSAGES_REFETCH_MS,
  })
}

/**
 * Conecta a conversa aberta direto ao Stream e empurra mensagens novas/editadas/
 * apagadas pro cache do React Query, mantendo a carga inicial via REST. Devolve
 * `connected` pra UI desligar o polling enquanto o realtime estiver ativo.
 */
export function useChatRealtime(role: Role, conversationId: string | null) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!conversationId) return

    const lifecycle = { cancelled: false }
    const cancelled = () => lifecycle.cancelled
    let channel: Channel | null = null
    const subscriptions: { unsubscribe: () => void }[] = []
    const ignore = () => undefined

    const upsert = (raw: unknown) => {
      const message = serializeStreamMessage(raw as Parameters<typeof serializeStreamMessage>[0])
      if (!message) return
      queryClient.setQueryData<ChatMessage[]>(messagesKey(role, conversationId), (prev) => {
        const list = prev ?? []
        const index = list.findIndex((item) => item.id === message.id)
        if (index === -1) return [...list, message]
        const next = list.slice()
        next[index] = { ...next[index], ...message }
        return next
      })
    }

    void (async () => {
      const client = await getChatClient(role)
      if (!client || cancelled()) return

      channel = client.channel('messaging', conversationId)
      try {
        await channel.watch()
      } catch {
        return
      }
      if (cancelled()) {
        void channel.stopWatching().catch(ignore)
        return
      }

      for (const message of channel.state.messages) upsert(message)
      setConnected(true)

      subscriptions.push(
        channel.on('message.new', (event) => {
          upsert(event.message)
        }),
      )
      subscriptions.push(
        channel.on('message.updated', (event) => {
          upsert(event.message)
        }),
      )
      subscriptions.push(
        channel.on('message.deleted', (event) => {
          upsert(event.message)
        }),
      )
    })()

    return () => {
      lifecycle.cancelled = true
      setConnected(false)
      for (const subscription of subscriptions) subscription.unsubscribe()
      void channel?.stopWatching().catch(ignore)
    }
  }, [role, conversationId, queryClient])

  return { connected }
}

export function useSendChatMessage(role: Role) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      sendChatMessage(role, conversationId, text),
    onSuccess: (_message, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: messagesKey(role, conversationId) })
      void queryClient.invalidateQueries({ queryKey: conversationsKey(role) })
    },
  })
}

export function useStartChatConversation(role: Role) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ peerId, name }: { peerId: string; name?: string | undefined }) => {
      const conversation = await createChatConversation(role, peerId, name)
      if (name && conversation.name !== name) {
        try {
          return await updateChatConversation(role, conversation.id, { name })
        } catch {
          return conversation
        }
      }
      return conversation
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationsKey(role) })
    },
  })
}
