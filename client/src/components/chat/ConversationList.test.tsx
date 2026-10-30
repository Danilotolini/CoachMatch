import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { ConversationList } from './ConversationList'
import { loginAs } from '@/test/session'
import { createWrapper } from '@/test/createWrapper'
import { server } from '@/mocks/server'

function renderList({
  selectedId = null,
  onSelect = () => {},
}: {
  selectedId?: string | null
  onSelect?: (id: string) => void
} = {}) {
  loginAs('client')
  const { wrapper } = createWrapper()
  return render(<ConversationList role="client" selectedId={selectedId} onSelect={onSelect} />, {
    wrapper,
  })
}

describe('ConversationList', () => {
  it('exibe skeletons de carregamento inicialmente', () => {
    renderList()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('exibe mensagem de estado vazio quando não há conversas', async () => {
    server.use(
      http.get('*/student/chat/conversations', () => HttpResponse.json([])),
    )
    renderList()
    await waitFor(() => {
      expect(screen.getByText(/você ainda não tem conversas/i)).toBeInTheDocument()
    })
  })

  it('exibe mensagem de erro quando a API falha', async () => {
    server.use(
      http.get('*/student/chat/conversations', () =>
        HttpResponse.json({ errors: ['Erro interno'] }, { status: 500 }),
      ),
    )
    renderList()
    await waitFor(() => {
      expect(
        screen.getByText(/não foi possível carregar|erro interno/i),
      ).toBeInTheDocument()
    })
  })

  it('lista as conversas existentes', async () => {
    server.use(
      http.get('*/student/chat/conversations', () =>
        HttpResponse.json([
          {
            id: 'conv-1',
            name: 'Carlos Treinador',
            members: ['student-1', 'coach-1'],
            frozen: false,
            lastMessageAt: '2026-08-10T10:00:00Z',
            image: null,
            lastMessage: { text: 'Oi, tudo bem?' },
          },
        ]),
      ),
    )
    renderList()
    await waitFor(() => {
      expect(screen.getByText('Carlos Treinador')).toBeInTheDocument()
    })
    expect(screen.getByText('Oi, tudo bem?')).toBeInTheDocument()
  })

  it('aciona onSelect ao clicar em uma conversa', async () => {
    const onSelect = vi.fn()
    server.use(
      http.get('*/student/chat/conversations', () =>
        HttpResponse.json([
          {
            id: 'conv-2',
            name: 'Maria Coach',
            members: ['student-1', 'coach-2'],
            frozen: false,
            lastMessageAt: null,
            image: null,
            lastMessage: null,
          },
        ]),
      ),
    )
    loginAs('client')
    const { wrapper } = createWrapper()
    render(<ConversationList role="client" selectedId={null} onSelect={onSelect} />, { wrapper })
    await waitFor(() => screen.getByText('Maria Coach'))
    await userEvent.click(screen.getByText('Maria Coach'))
    expect(onSelect).toHaveBeenCalledWith('conv-2')
  })
})
