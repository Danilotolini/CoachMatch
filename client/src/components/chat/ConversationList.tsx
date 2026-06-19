import { useChatConversations } from '@/hooks/useChat'
import { Icon } from '@/components/ui/Icon'
import { formatBrazilTime } from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import type { Role } from '@/stores/sessionStore'
import type { ChatConversation } from '@/types/api'

interface ConversationListProps {
  role: Role
  selectedId: string | null
  onSelect: (id: string) => void
}

function conversationTitle(conversation: ChatConversation): string {
  return conversation.name?.trim() ?? 'Conversa'
}

export function ConversationList({ role, selectedId, onSelect }: ConversationListProps) {
  const { data, isLoading, isError, error } = useChatConversations(role)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-container-low" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="p-6 font-body text-sm text-on-surface-variant">
        {parseApiErrors(error, 'Não foi possível carregar suas conversas.')}
      </p>
    )
  }

  const conversations = data ?? []

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Icon name="forum" size={34} className="text-primary" />
        <p className="font-body text-sm text-on-surface-variant">
          Você ainda não tem conversas. Inicie uma a partir dos detalhes de uma sessão.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col">
      {conversations.map((conversation) => {
        const isActive = conversation.id === selectedId
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(conversation.id)
              }}
              aria-current={isActive ? 'true' : undefined}
              className={`flex w-full items-center gap-3 border-b border-outline-variant/10 px-4 py-3.5 text-left transition-colors ${
                isActive ? 'bg-surface-container-high' : 'hover:bg-surface-container-low'
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
                <Icon name="person" size={22} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-label text-sm font-semibold text-on-surface">
                    {conversationTitle(conversation)}
                  </span>
                  {conversation.lastMessageAt && (
                    <span className="shrink-0 font-label text-[11px] text-on-surface-variant">
                      {formatBrazilTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </span>
                <span className="truncate font-body text-xs text-on-surface-variant">
                  {conversation.lastMessage?.text ?? 'Nenhuma mensagem ainda'}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
