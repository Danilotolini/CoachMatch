import { useSearchParams } from 'react-router'
import { ChatView } from '@/components/chat/ChatView'
import { CoachBottomNav, CoachSideNav } from '@/components/layout/CoachNavigation'

export default function CoachChatPage() {
  const [searchParams] = useSearchParams()
  const hasSelection = !!searchParams.get('c')

  return (
    <main className="relative flex h-dvh w-full overflow-hidden bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`border-b border-outline-variant/10 px-4 py-4 sm:px-6 lg:py-6 ${
            hasSelection ? 'hidden lg:block' : ''
          }`}
        >
          <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Conversas</h1>
        </header>
        <ChatView role="coach" />
      </div>

      {!hasSelection && <CoachBottomNav />}
    </main>
  )
}
