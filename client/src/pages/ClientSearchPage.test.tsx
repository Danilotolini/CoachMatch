import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import ClientSearchPage from './ClientSearchPage'
import { server } from '@/mocks/server'
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

  it('mostra estado vazio e limpa os filtros', async () => {
    renderClientSearch(['/client/search?q=sem-resultado-improvavel'])

    expect(
      await screen.findByText('Nenhum treinador encontrado pra esses filtros'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'LIMPAR FILTROS' }))

    expect(await screen.findByText('Priscila Duarte')).toBeInTheDocument()
  })

  it('mostra erro e permite buscar novamente', async () => {
    let shouldFail = true

    server.use(
      http.get('*/student/coaches', () => {
        if (shouldFail) {
          return HttpResponse.json({ error: 'boom' }, { status: 500 })
        }

        return HttpResponse.json({
          data: [
            {
              coachId: 'coach_retry',
              name: 'Coach Retry',
              specialties: ['Yoga'],
              rating: 4.7,
              priceFrom: 130,
              city: 'São Paulo',
              neighborhood: 'Moema',
              nextAvailability: 'Hoje',
              photo: null,
            },
          ],
          pagination: { page: 1, limit: 9, total: 1, hasNext: false },
        })
      }),
    )

    renderClientSearch()

    expect(await screen.findByText('Não foi possível carregar a busca')).toBeInTheDocument()

    shouldFail = false
    await userEvent.click(screen.getByRole('button', { name: 'TENTAR DE NOVO' }))

    expect(await screen.findByText('Coach Retry')).toBeInTheDocument()
    expect(screen.getByText('Fim dos resultados')).toBeInTheDocument()
  })

  it('renderiza pagina final sem botão de ver mais', async () => {
    server.use(
      http.get('*/student/coaches', () =>
        HttpResponse.json({
          data: [
            {
              coachId: 'coach_last_page',
              name: 'Última Página',
              specialties: ['Funcional'],
              rating: 4.5,
              priceFrom: 99,
              city: 'Santos',
              neighborhood: 'Boqueirão',
              nextAvailability: 'Amanhã',
              photo: null,
            },
          ],
          pagination: { page: 1, limit: 9, total: 1, hasNext: false },
        }),
      ),
    )

    renderClientSearch(['/client/search?specialties[]=Funcional&page=abc'])

    expect(await screen.findByText('Última Página')).toBeInTheDocument()
    expect(screen.getByText('Fim dos resultados')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VER MAIS' })).not.toBeInTheDocument()
  })
})
