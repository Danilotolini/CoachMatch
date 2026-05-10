import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import WelcomePage from './WelcomePage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/entrar" element={<div>login page</div>} />
        <Route path="/cadastro/cliente" element={<div>cadastro cliente page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WelcomePage', () => {
  it('renderiza título e dois cards de acesso', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Bem-vindo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acesso Aluno/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acesso Profissional/i })).toBeInTheDocument()
  })

  it('navega para /cadastro/cliente ao clicar em Acesso Aluno', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Acesso Aluno/i }))
    expect(screen.getByText('cadastro cliente page')).toBeInTheDocument()
  })

  it('navega para /entrar ao clicar em Acesso Profissional', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Acesso Profissional/i }))
    expect(screen.getByText('login page')).toBeInTheDocument()
  })
})
