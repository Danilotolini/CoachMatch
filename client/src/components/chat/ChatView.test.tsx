import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ChatView } from './ChatView'
import { createChatConversation, updateChatConversation } from '@/api/chat'
import { buildMockIdToken } from '@/dev/mockSession'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

describe('ChatView', () => {
  beforeEach(() => {
    loginAs('client', buildMockIdToken('client'))
  })

  it('lista conversas, abre a thread e envia uma mensagem', async () => {
    const user = userEvent.setup()
    const conversation = await createChatConversation('client', 'coach_chatview_send')
    await updateChatConversation('client', conversation.id, { name: 'Treinador Teste' })
    const { wrapper } = createWrapper()

    render(
      <MemoryRouter initialEntries={['/client/chat']}>
        <ChatView role="client" />
      </MemoryRouter>,
      { wrapper },
    )

    await user.click(await screen.findByText('Treinador Teste'))

    const input = await screen.findByLabelText('Mensagem')
    await user.type(input, 'Olá, treinador')
    await user.click(screen.getByLabelText('Enviar'))

    // Aparece na thread e como prévia da última mensagem na lista.
    expect(await screen.findAllByText('Olá, treinador')).toHaveLength(2)
  })

  it('mostra o estado vazio quando não há conversas', async () => {
    const { wrapper } = createWrapper()

    render(
      <MemoryRouter initialEntries={['/coach/chat']}>
        <ChatView role="coach" />
      </MemoryRouter>,
      { wrapper },
    )

    expect(await screen.findByText(/você ainda não tem conversas/i)).toBeInTheDocument()
  })
})
