import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import ClientSearchPage from './ClientSearchPage'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

function renderClientSearch(initialEntries = ['/client/search']) {
  loginAs('client')
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryWrapper>
        <ClientSearchPage />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('ClientSearchPage', () => {
  it('renderiza resultados iniciais', async () => {
    renderClientSearch()

    expect(screen.getByRole('heading', { name: 'Buscar treinador' })).toBeInTheDocument()
    expect(await screen.findByText('Priscila Duarte')).toBeInTheDocument()
    expect(screen.getByText('Marcos Vieira')).toBeInTheDocument()
  })

  it('exibe filtros vindos da URL e permite limpar', async () => {
    renderClientSearch(['/client/search?q=funcional&address=São Paulo'])

    expect(await screen.findByText('Busca: funcional')).toBeInTheDocument()
    expect(screen.getByText('São Paulo')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Remover São Paulo'))

    await waitFor(() => {
      expect(screen.queryByLabelText('Remover São Paulo')).not.toBeInTheDocument()
    })
  })

  it('aplica modalidade pelo sheet de filtros', async () => {
    renderClientSearch()

    await userEvent.click(screen.getByLabelText('Abrir filtros avançados'))
    await userEvent.click(screen.getByRole('button', { name: 'Yoga' }))
    await userEvent.click(screen.getByRole('button', { name: 'APLICAR' }))

    expect(await screen.findByText('Yoga')).toBeInTheDocument()
    expect(await screen.findByText('Larissa Nunes')).toBeInTheDocument()
  })

  it('troca ordenação por menor preço', async () => {
    renderClientSearch()

    await screen.findByText('Priscila Duarte')
    await userEvent.click(screen.getByRole('radio', { name: 'Menor preço' }))

    await waitFor(() => {
      expect(screen.getByText('12 treinadores encontrados')).toBeInTheDocument()
    })
    expect(screen.getByRole('radio', { name: 'Menor preço' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
