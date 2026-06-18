import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { StartChatButton } from './StartChatButton'
import { buildMockIdToken } from '@/dev/mockSession'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useNavigate: () => navigate }
})

describe('StartChatButton', () => {
  beforeEach(() => {
    navigate.mockClear()
    loginAs('client', buildMockIdToken('client'))
  })

  it('cria a conversa e navega para a thread', async () => {
    const user = userEvent.setup()
    const { wrapper } = createWrapper()

    render(
      <MemoryRouter>
        <StartChatButton
          role="client"
          peerId="coach_start_btn"
          peerName="Treinador Teste"
          chatPath="/client/chat"
        />
      </MemoryRouter>,
      { wrapper },
    )

    await user.click(screen.getByRole('button', { name: /conversar/i }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/client\/chat\?c=dm_/))
    })
  })
})
