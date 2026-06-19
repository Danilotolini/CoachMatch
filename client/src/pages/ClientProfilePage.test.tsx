import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import ClientProfilePage from './ClientProfilePage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import type { Client, ClientProfilePayload } from '@/types/api'

// react-easy-crop e o canvas (toBlob) não rodam no happy-dom. Substituímos o
// cropper por um stub que já reporta uma área válida e o recorte por um no-op
// que devolve o próprio arquivo, mantendo o fluxo de upload testável.
vi.mock('react-easy-crop', () => ({
  default: ({
    onCropComplete,
  }: {
    onCropComplete: (a: unknown, b: { x: number; y: number; width: number; height: number }) => void
  }) => {
    useEffect(() => {
      onCropComplete({}, { x: 0, y: 0, width: 100, height: 100 })
    }, [onCropComplete])
    return null
  },
}))
vi.mock('@/lib/cropImage', () => ({
  cropToSquareFile: (file: File) => Promise.resolve(file),
}))

const activeClient: Client = {
  clientId: 'client_demo',
  email: 'joao@coachmatch.app',
  status: 'ACTIVE',
  name: 'João Aluno',
  phone: '11999998888',
  birthDate: '1994-03-14',
  gender: 'M',
  cep: '01310-100',
  city: 'São Paulo',
  state: 'SP',
  radius: 10,
  goal: 'HYPERTROPHY',
  health: null,
  photo_url: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function mockCepSuccess() {
  server.use(
    http.get('https://viacep.com.br/ws/:cep/json/', () =>
      HttpResponse.json({
        cep: '22041-001',
        logradouro: 'Avenida Atlântica',
        complemento: '',
        bairro: 'Copacabana',
        localidade: 'Rio de Janeiro',
        uf: 'RJ',
      }),
    ),
  )
}

function renderPage() {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter>
        <ClientProfilePage />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

beforeEach(() => {
  loginAs('client')
})

describe('ClientProfilePage', () => {
  it('mostra estados de carregamento e erro ao buscar perfil', async () => {
    server.use(
      http.get('*/student/me', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    renderPage()

    expect(screen.getByText('Carregando seu perfil...')).toBeInTheDocument()
    expect(await screen.findByText('Não foi possível carregar seu perfil.')).toBeInTheDocument()
  })

  it('exibe status pendente para aluno sem perfil completo', async () => {
    server.use(
      http.get('*/student/me', () =>
        HttpResponse.json<Client>({ ...activeClient, status: 'PENDING_PROFILE' }),
      ),
    )

    renderPage()

    expect(await screen.findByText('Perfil pendente')).toBeInTheDocument()
  })

  it('carrega o perfil e salva alterações em POST /student/me/profile', async () => {
    let receivedPayload: ClientProfilePayload | null = null

    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(activeClient)),
      http.post('*/student/me/profile', async ({ request }) => {
        receivedPayload = (await request.json()) as ClientProfilePayload
        return HttpResponse.json<Client>({
          ...activeClient,
          name: receivedPayload.name,
          goal: receivedPayload.goal,
          radius: receivedPayload.radius,
          updatedAt: '2026-06-19T12:00:00Z',
        })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByDisplayValue('João Aluno')).toBeInTheDocument()
    // Telefone vem mascarado a partir dos dígitos do back-end.
    expect(screen.getByDisplayValue('(11) 99999-8888')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'João Costa')
    await user.click(screen.getByRole('button', { name: /Emagrecimento/ }))
    await user.click(screen.getByRole('button', { name: '20 km' }))
    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    await waitFor(() => {
      expect(receivedPayload).toEqual({
        name: 'João Costa',
        phone: '(11) 99999-8888',
        birthDate: '1994-03-14',
        gender: 'M',
        cep: '01310-100',
        city: 'São Paulo',
        state: 'SP',
        radius: 20,
        goal: 'WEIGHT_LOSS',
      })
    })
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
  })

  it('busca endereço pelo CEP e envia cidade e estado atualizados', async () => {
    let receivedPayload: ClientProfilePayload | null = null
    mockCepSuccess()

    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(activeClient)),
      http.post('*/student/me/profile', async ({ request }) => {
        receivedPayload = (await request.json()) as ClientProfilePayload
        return HttpResponse.json<Client>(activeClient)
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await screen.findByDisplayValue('João Aluno')

    await user.clear(screen.getByLabelText('CEP'))
    await user.type(screen.getByLabelText('CEP'), '22041001')

    expect(await screen.findByDisplayValue('Rio de Janeiro')).toBeInTheDocument()
    expect(screen.getByDisplayValue('RJ')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    await waitFor(() => {
      expect(receivedPayload?.cep).toBe('22041-001')
      expect(receivedPayload?.city).toBe('Rio de Janeiro')
      expect(receivedPayload?.state).toBe('RJ')
    })
  })

  it('faz upload de foto e envia photo_key no POST /student/me/profile', async () => {
    let receivedPayload: ClientProfilePayload | null = null

    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(activeClient)),
      http.post('*/student/me/profile', async ({ request }) => {
        receivedPayload = (await request.json()) as ClientProfilePayload
        return HttpResponse.json<Client>({
          ...activeClient,
          photo_url: 'https://mock-s3.local/signed/foto',
        })
      }),
    )

    const user = userEvent.setup()
    const { container } = renderPage()

    await screen.findByDisplayValue('João Aluno')

    const photoInput = container.querySelector<HTMLInputElement>('input[accept*="image"]')
    expect(photoInput).not.toBeNull()
    const photo = new File([new Uint8Array([1, 2, 3])], 'perfil.jpg', { type: 'image/jpeg' })
    await user.upload(photoInput as HTMLInputElement, photo)

    // Confirma o recorte quadrado no modal antes do upload seguir.
    await user.click(await screen.findByRole('button', { name: /Usar foto/i }))

    expect(await screen.findByText(/Salve o perfil para confirmar a foto/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    await waitFor(() => {
      expect(receivedPayload?.photo_key).toMatch(/^uploads\/.*perfil\.jpg$/)
    })
  })

  it('valida campos obrigatórios e bloqueia envio quando dados estão inválidos', async () => {
    let postCalled = false

    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(activeClient)),
      http.post('*/student/me/profile', () => {
        postCalled = true
        return HttpResponse.json<Client>(activeClient)
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await screen.findByDisplayValue('João Aluno')
    await user.clear(screen.getByLabelText('Nome completo'))
    await user.clear(screen.getByLabelText('Celular'))
    await user.type(screen.getByLabelText('Celular'), '123')
    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    expect(await screen.findByText('Informe seu nome completo.')).toBeInTheDocument()
    expect(screen.getByText('Telefone incompleto.')).toBeInTheDocument()
    expect(postCalled).toBe(false)
  })
})
