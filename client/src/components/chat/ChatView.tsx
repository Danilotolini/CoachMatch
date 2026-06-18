import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageThread } from '@/components/chat/MessageThread'
import { Icon } from '@/components/ui/Icon'
import { useChatConversations } from '@/hooks/useChat'
import { disconnectChat } from '@/lib/streamChat'
import type { Role } from '@/stores/sessionStore'

const SELECTED_PARAM = 'c'

export function ChatView({ role }: { role: Role }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get(SELECTED_PARAM)
  const { data } = useChatConversations(role)

  // Fecha o WebSocket do Stream ao sair do chat; a próxima visita reconecta.
  useEffect(() => {
    return () => {
      void disconnectChat()
    }
  }, [])

  const selected = data?.find((conversation) => conversation.id === selectedId) ?? null
  const selectedTitle = selected?.name?.trim() ?? 'Conversa'

  function selectConversation(id: string) {
    setSearchParams(
      (prev) => {
        prev.set(SELECTED_PARAM, id)
        return prev
      },
      { replace: false },
    )
  }

  function clearSelection() {
    setSearchParams(
      (prev) => {
        prev.delete(SELECTED_PARAM)
        return prev
      },
      { replace: false },
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div
        className={`${
          selectedId ? 'hidden' : 'flex'
        } min-h-0 w-full flex-col overflow-y-auto border-outline-variant/10 pb-24 lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:pb-0`}
      >
        <ConversationList role={role} selectedId={selectedId} onSelect={selectConversation} />
      </div>

      <div className={`${selectedId ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 lg:flex`}>
        {selectedId ? (
          <MessageThread
            role={role}
            conversationId={selectedId}
            title={selectedTitle}
            onBack={clearSelection}
          />
        ) : (
          <div className="hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center lg:flex">
            <Icon name="chat" size={40} className="text-on-surface-variant/40" />
            <p className="font-body text-sm text-on-surface-variant">
              Selecione uma conversa para começar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
