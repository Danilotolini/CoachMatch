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
    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getByText('Julia Ramos')).toBeInTheDocument()
  })

  it('acumula resultados ao clicar em ver mais', async () => {
    renderClientSearch()

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.queryByText('Rafael Souza')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'VER MAIS' }))

    expect(await screen.findByText('Rafael Souza')).toBeInTheDocument()
    expect(screen.getByText('Marcos Vieira')).toBeInTheDocument()
  })

  it('exibe filtros vindos da URL e permite limpar', async () => {
    renderClientSearch(['/client/search?q=funcional&specialties[]=Funcional'])

    expect(await screen.findByText('Busca: funcional')).toBeInTheDocument()
    expect(screen.getByText('Funcional')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Remover Funcional'))

    await waitFor(() => {
      expect(screen.queryByLabelText('Remover Funcional')).not.toBeInTheDocument()
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

  it('mostra estado vazio e limpa os filtros', async () => {
    renderClientSearch(['/client/search?q=sem-resultado-improvavel'])

    expect(
      await screen.findByText('Nenhum treinador encontrado pra esses filtros'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'LIMPAR FILTROS' }))

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
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
              profile: {
                name: 'Coach Retry',
                phone: null,
                specialties: ['Yoga'],
                cref: null,
                instagram: null,
                profile_video: false,
              },
              work_location: [],
            },
          ],
          meta: { limit: 9, lastKey: null },
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
              profile: {
                name: 'Última Página',
                phone: null,
                specialties: ['Funcional'],
                cref: null,
                instagram: null,
                profile_video: false,
              },
              work_location: [],
            },
          ],
          meta: { limit: 9, lastKey: null },
        }),
      ),
    )

    renderClientSearch(['/client/search?specialties[]=Funcional'])

    expect(await screen.findByText('Última Página')).toBeInTheDocument()
    expect(screen.getByText('Fim dos resultados')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'VER MAIS' })).not.toBeInTheDocument()
  })
})
