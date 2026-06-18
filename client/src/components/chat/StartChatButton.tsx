import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useStartChatConversation } from '@/hooks/useChat'
import { Button } from '@/components/ui/Button'
import { parseApiErrors } from '@/lib/http'
import type { Role } from '@/stores/sessionStore'

interface StartChatButtonProps {
  role: Role
  peerId: string
  peerName?: string | null
  chatPath: string
  label?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

export function StartChatButton({
  role,
  peerId,
  peerName,
  chatPath,
  label = 'CONVERSAR',
  variant = 'secondary',
  className,
}: StartChatButtonProps) {
  const navigate = useNavigate()
  const startConversation = useStartChatConversation(role)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setError(null)
    try {
      const name = peerName?.trim()
      const conversation = await startConversation.mutateAsync(name ? { peerId, name } : { peerId })
      await navigate(`${chatPath}?c=${encodeURIComponent(conversation.id)}`)
    } catch (e) {
      setError(parseApiErrors(e, 'Não foi possível iniciar a conversa.'))
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={variant}
        icon="forum"
        loading={startConversation.isPending}
        onClick={() => {
          void handleStart()
        }}
        className={className ?? 'shrink-0'}
      >
        {label}
      </Button>
      {error && <span className="font-label text-xs text-error">{error}</span>}
    </div>
  )
}
