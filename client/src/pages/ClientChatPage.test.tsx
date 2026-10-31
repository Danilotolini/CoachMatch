import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import ClientChatPage from './ClientChatPage'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

function renderPage(search = '') {
  loginAs('client')
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <MemoryRouter initialEntries={[`/client/chat${search}`]}>
      <QueryWrapper>
        <ClientChatPage />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('ClientChatPage', () => {
  it('exibe o header Conversas quando não há conversa selecionada', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Conversas' })).toBeInTheDocument()
  })

  it('oculta o header em mobile quando há conversa selecionada (?c=)', () => {
    renderPage('?c=conv-1')
    const header = screen.getByRole('heading', { name: 'Conversas' }).closest('header')
    expect(header?.className).toMatch(/hidden/)
  })
})
