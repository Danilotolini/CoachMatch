import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/http'
import type { Role } from '@/stores/sessionStore'
import type { ChatConversation, ChatHidden, ChatMessage, ChatToken } from '@/types/api'

function chatBase(role: Role): string {
  return role === 'coach' ? '/coach/chat' : '/student/chat'
}

export function getChatToken(role: Role): Promise<ChatToken> {
  return apiPost<ChatToken>(`${chatBase(role)}/token`, undefined, { role })
}

export function listChatConversations(role: Role, limit?: number): Promise<ChatConversation[]> {
  return apiGet<ChatConversation[]>(
    `${chatBase(role)}/conversations`,
    limit ? { limit } : undefined,
    { role },
  )
}

export function createChatConversation(
  role: Role,
  peerId: string,
  peerName?: string,
): Promise<ChatConversation> {
  return apiPost<ChatConversation>(
    `${chatBase(role)}/conversations`,
    peerName ? { peerId, peerName } : { peerId },
    { role },
  )
}

export function updateChatConversation(
  role: Role,
  conversationId: string,
  body: { name?: string; frozen?: boolean },
): Promise<ChatConversation> {
  return apiPatch<ChatConversation>(
    `${chatBase(role)}/conversations/${encodeURIComponent(conversationId)}`,
    body,
    { role },
  )
}

export function hideChatConversation(role: Role, conversationId: string): Promise<ChatHidden> {
  return apiDelete<ChatHidden>(
    `${chatBase(role)}/conversations/${encodeURIComponent(conversationId)}`,
    undefined,
    { role },
  )
}

export function listChatMessages(
  role: Role,
  conversationId: string,
  params?: { limit?: number; before?: string },
): Promise<ChatMessage[]> {
  return apiGet<ChatMessage[]>(
    `${chatBase(role)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    params,
    { role },
  )
}

export function sendChatMessage(
  role: Role,
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  return apiPost<ChatMessage>(
    `${chatBase(role)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    { text },
    { role },
  )
}
