import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MessageThread } from './MessageThread'
import { loginAs } from '@/test/session'
import { createWrapper } from '@/test/createWrapper'
import { server } from '@/mocks/server'
import type { ChatMessage } from '@/types/api'

function renderThread({
  conversationId = 'conv-1',
  title = 'Carlos Coach',
  onBack = vi.fn(),
  onHeaderClick,
}: {
  conversationId?: string
  title?: string
  onBack?: () => void
  onHeaderClick?: () => void
} = {}) {
  loginAs('client')
  const { wrapper } = createWrapper()
  return render(
    <MessageThread
      role="client"
      conversationId={conversationId}
      title={title}
      onBack={onBack}
      onHeaderClick={onHeaderClick}
    />,
    { wrapper },
  )
}

describe('MessageThread', () => {
  it('exibe skeletons durante carregamento', () => {
    renderThread()
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('exibe mensagem de estado vazio quando não há mensagens', async () => {
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
    )
    renderThread()
    await waitFor(() => {
      expect(screen.getByText(/nenhuma mensagem ainda/i)).toBeInTheDocument()
    })
  })

  it('exibe mensagens carregadas', async () => {
    const messages: ChatMessage[] = [
      { id: 'm1', text: 'Oi tudo bem?', userId: 'other', createdAt: '2026-08-10T10:00:00Z' },
      { id: 'm2', text: 'Tudo sim!', userId: 'me', createdAt: '2026-08-10T10:01:00Z' },
    ]
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json(messages),
      ),
    )
    renderThread()
    await waitFor(() => {
      expect(screen.getByText('Oi tudo bem?')).toBeInTheDocument()
    })
    expect(screen.getByText('Tudo sim!')).toBeInTheDocument()
  })

  it('ordena mensagens sem createdAt por último (comparador usa 0)', async () => {
    const messages: ChatMessage[] = [
      { id: 'm2', text: 'Segunda', userId: 'u', createdAt: '2026-08-10T10:05:00Z' },
      { id: 'm1', text: 'Primeira', userId: 'u' },
    ]
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json(messages),
      ),
    )
    renderThread()
    await waitFor(() => screen.getByText('Primeira'))
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Primeira')
    expect(items[1]).toHaveTextContent('Segunda')
  })

  it('exibe erro quando a API de mensagens falha', async () => {
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json({ errors: ['Falha'] }, { status: 500 }),
      ),
    )
    renderThread()
    await waitFor(() => {
      expect(
        screen.getByText(/não foi possível carregar|falha/i),
      ).toBeInTheDocument()
    })
  })

  it('chama onBack ao clicar no botão voltar', async () => {
    const onBack = vi.fn()
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
    )
    renderThread({ onBack })
    await waitFor(() => screen.getByRole('button', { name: 'Voltar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('exibe botão de header clicável quando onHeaderClick é fornecido', async () => {
    const onHeaderClick = vi.fn()
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
    )
    renderThread({ onHeaderClick })
    await waitFor(() => screen.getByText('Carlos Coach'))
    await userEvent.click(screen.getByText('Carlos Coach'))
    expect(onHeaderClick).toHaveBeenCalledTimes(1)
  })

  it('submete mensagem ao clicar no botão enviar', async () => {
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
      http.post('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json<import('@/types/api').ChatMessage>({
          id: 'm-ok',
          text: 'Olá!',
          userId: 'me',
          createdAt: '2026-08-10T10:00:00Z',
        }),
      ),
    )
    renderThread()
    await waitFor(() => screen.getByRole('button', { name: 'Enviar' }))
    const input = screen.getByLabelText('Mensagem')
    await userEvent.type(input, 'Olá!')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('submete mensagem ao pressionar Enter no textarea', async () => {
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
      http.post('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json<import('@/types/api').ChatMessage>({
          id: 'm-ok',
          text: 'Olá via Enter',
          userId: 'me',
          createdAt: '2026-08-10T10:00:00Z',
        }),
      ),
    )
    renderThread()
    await waitFor(() => screen.getByLabelText('Mensagem'))
    const input = screen.getByLabelText('Mensagem')
    await userEvent.type(input, 'Olá via Enter{Enter}')
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('exibe erro de envio quando a API de mensagens falha no envio', async () => {
    server.use(
      http.get('*/student/chat/conversations/:id/messages', () => HttpResponse.json([])),
      http.post('*/student/chat/conversations/:id/messages', () =>
        HttpResponse.json({ errors: ['Falha ao enviar'] }, { status: 500 }),
      ),
    )
    renderThread()
    await waitFor(() => screen.getByLabelText('Mensagem'))
    const input = screen.getByLabelText('Mensagem')
    await userEvent.type(input, 'oi')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await waitFor(() => {
      expect(screen.getByText(/não foi possível enviar|falha ao enviar/i)).toBeInTheDocument()
    })
  })
})
