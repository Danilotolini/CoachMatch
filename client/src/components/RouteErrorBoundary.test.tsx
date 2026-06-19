import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'

function Boom({ error }: { error: unknown }): never {
  throw error
}

function renderWithError(error: unknown) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Boom error={error} />,
      errorElement: <RouteErrorBoundary />,
    },
  ])
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  // React Router loga o erro capturado; silenciamos para não poluir a saída.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RouteErrorBoundary', () => {
  it('renderiza o fallback quando uma rota lança', () => {
    renderWithError(new Error('chunk falhou ao carregar'))

    expect(screen.getByText(/Algo deu errado/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Não foi possível carregar esta tela/i }),
    ).toBeInTheDocument()
  })

  it('mostra a mensagem de um Error', () => {
    renderWithError(new Error('chunk falhou ao carregar'))

    expect(screen.getByText('chunk falhou ao carregar')).toBeInTheDocument()
  })

  it('mostra status e statusText de uma resposta de rota', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        loader: () => {
          throw new Response('', { status: 503, statusText: 'Service Unavailable' })
        },
        element: <div>nunca renderiza</div>,
        errorElement: <RouteErrorBoundary />,
      },
    ])
    render(<RouterProvider router={router} />)

    expect(await screen.findByText('503 Service Unavailable')).toBeInTheDocument()
  })

  it('cai num texto genérico quando o erro não é Error nem resposta', () => {
    renderWithError('falha solta')

    expect(screen.getByText('Erro inesperado.')).toBeInTheDocument()
  })

  it('recarrega a página ao clicar em RECARREGAR', async () => {
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as Location)

    renderWithError(new Error('falhou'))
    await userEvent.click(screen.getByRole('button', { name: /RECARREGAR/i }))

    expect(reload).toHaveBeenCalledOnce()
  })
})
