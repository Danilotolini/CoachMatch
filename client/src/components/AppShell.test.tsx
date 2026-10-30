import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { loginAs } from '@/test/session'

function renderShell(pathname = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[pathname]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="*" element={<div>Conteúdo da rota</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell', () => {
  it('renderiza o conteúdo do Outlet', () => {
    loginAs('client')
    renderShell()
    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument()
  })

  it('não exibe o botão de dev quando já está na rota /dev', () => {
    loginAs('client')
    renderShell('/dev')
    expect(screen.queryByRole('link', { name: 'Abrir painel dev' })).not.toBeInTheDocument()
  })
})
