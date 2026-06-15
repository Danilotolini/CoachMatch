import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import NotFoundPage from './NotFoundPage'

function LocationSpy({ onLocation }: { onLocation: (p: string) => void }) {
  onLocation(useLocation().pathname)
  return null
}

function renderMissingRoute(path = '/rota-inexistente') {
  let currentPath = path
  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationSpy onLocation={(p) => (currentPath = p)} />
      <Routes>
        <Route path="/" element={<div>Pagina inicial</div>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return { getCurrentPath: () => currentPath }
}

describe('NotFoundPage', () => {
  it('renderiza a pagina 404 quando a rota nao existe', () => {
    renderMissingRoute()

    expect(screen.getByText(/Rota fora do treino/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Página não encontrada/i })).toBeInTheDocument()
    expect(screen.getByText(/O endereço que você tentou acessar saiu do mapa/i)).toBeInTheDocument()
  })

  it('CTA navega para o inicio ao clicar', async () => {
    const { getCurrentPath } = renderMissingRoute('/qualquer/coisa')

    await userEvent.click(screen.getByRole('button', { name: /IR PARA O INÍCIO/i }))

    expect(getCurrentPath()).toBe('/')
  })
})
