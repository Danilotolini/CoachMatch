import { useSearchParams } from 'react-router'
import { ChatView } from '@/components/chat/ChatView'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'

export default function ClientChatPage() {
  const [searchParams] = useSearchParams()
  const hasSelection = !!searchParams.get('c')

  return (
    <main className="relative flex h-dvh w-full overflow-hidden bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={`border-b border-outline-variant/10 px-4 py-4 sm:px-6 lg:py-6 ${
            hasSelection ? 'hidden lg:block' : ''
          }`}
        >
          <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Conversas</h1>
        </header>
        <ChatView role="client" />
      </div>

      {!hasSelection && <ClientBottomNav />}
    </main>
  )
}
