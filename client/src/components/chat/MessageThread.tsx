import { useEffect, useMemo, useRef, useState } from 'react'
import { useChatMessages, useChatRealtime, useSendChatMessage } from '@/hooks/useChat'
import { Icon } from '@/components/ui/Icon'
import { getUserId } from '@/lib/auth'
import { formatBrazilTime } from '@/lib/dateTime'
import { parseApiErrors } from '@/lib/http'
import type { Role } from '@/stores/sessionStore'
import type { ChatMessage } from '@/types/api'

interface MessageThreadProps {
  role: Role
  conversationId: string
  title: string
  onBack: () => void
}

function sortByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return aTime - bTime
  })
}

export function MessageThread({ role, conversationId, title, onBack }: MessageThreadProps) {
  const { connected } = useChatRealtime(role, conversationId)
  const { data, isLoading, isError, error } = useChatMessages(role, conversationId, {
    realtime: connected,
  })
  const sendMessage = useSendChatMessage(role)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selfId = getUserId(role)

  const messages = useMemo(
    () => sortByCreatedAt((data ?? []).filter((message) => !message.deletedAt)),
    [data],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function handleSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sendMessage.isPending) return
    setSendError(null)
    try {
      await sendMessage.mutateAsync({ conversationId, text })
      setDraft('')
    } catch (e) {
      setSendError(parseApiErrors(e, 'Não foi possível enviar a mensagem.'))
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-outline-variant/10 px-4 py-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface transition-colors hover:bg-surface-container-high lg:hidden"
        >
          <Icon name="arrow_back" size={20} />
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
          <Icon name="person" size={20} />
        </span>
        <h2 className="truncate font-headline text-base font-semibold tracking-tight text-on-surface">
          {title}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 w-2/3 animate-pulse rounded-xl bg-surface-container-low"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="font-body text-sm text-on-surface-variant">
            {parseApiErrors(error, 'Não foi possível carregar as mensagens.')}
          </p>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-center font-body text-sm text-on-surface-variant">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => {
              const isMine = !!selfId && message.userId === selfId
              return (
                <li
                  key={message.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? 'bg-primary text-on-primary-fixed'
                        : 'bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <p className="whitespace-pre-wrap wrap-break-word font-body text-sm">
                      {message.text}
                    </p>
                  </div>
                  {message.createdAt && (
                    <span className="mt-0.5 px-1 font-label text-[10px] text-on-surface-variant">
                      {formatBrazilTime(message.createdAt)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="border-t border-outline-variant/10 p-3"
      >
        {sendError && <p className="mb-2 px-1 font-label text-xs text-error">{sendError}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSubmit(event)
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem"
            aria-label="Mensagem"
            maxLength={5000}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-3 font-body text-sm text-on-surface outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMessage.isPending}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Icon name="send" size={20} />
          </button>
        </div>
      </form>
    </div>
  )
}
