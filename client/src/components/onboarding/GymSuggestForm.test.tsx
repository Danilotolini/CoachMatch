import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GymSuggestForm } from './GymSuggestForm'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('coach')
})

function renderForm() {
  const onSuggested = vi.fn()
  const onCancel = vi.fn()
  const { wrapper: Wrapper } = createWrapper()
  render(
    <Wrapper>
      <GymSuggestForm onSuggested={onSuggested} onCancel={onCancel} />
    </Wrapper>,
  )
  return { onSuggested, onCancel }
}

function mockCepSuccess() {
  server.use(
    http.get('https://viacep.com.br/ws/:cep/json/', () =>
      HttpResponse.json({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    ),
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: /São Paulo \(SP\)/i })
  await user.type(screen.getByPlaceholderText(/Smart Fit Boa Viagem/i), 'Academia Nova')
  await user.selectOptions(screen.getByRole('combobox'), 'SP')

  const cityInput = await screen.findByPlaceholderText(/Digite para buscar/i)
  await user.type(cityInput, 'São Paulo')
  await user.click(await screen.findByRole('button', { name: 'São Paulo' }))

  await user.type(screen.getByLabelText('Bairro'), 'Bela Vista')
  await user.type(screen.getByLabelText(/Endereço/i), 'Av. Paulista, 1000')
}

async function fillFormWithTypedCity(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: /São Paulo \(SP\)/i })
  await user.type(screen.getByPlaceholderText(/Smart Fit Boa Viagem/i), 'Academia Nova')
  await user.selectOptions(screen.getByRole('combobox'), 'SP')
  await user.type(await screen.findByPlaceholderText(/Digite para buscar/i), 'São Paulo')
  await user.type(screen.getByLabelText('Bairro'), 'Bela Vista')
  await user.type(screen.getByLabelText(/Endereço/i), 'Av. Paulista, 1000')
}

describe('GymSuggestForm', () => {
  it('mantém o envio desabilitado enquanto faltam campos', async () => {
    const user = userEvent.setup()
    renderForm()

    const submit = await screen.findByRole('button', { name: /ENVIAR SUGESTÃO/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/Smart Fit Boa Viagem/i), 'Só o nome')
    expect(submit).toBeDisabled()
  })

  it('envia a sugestão com coordenadas nulas e devolve a academia criada', async () => {
    const user = userEvent.setup()
    const { onSuggested } = renderForm()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /ENVIAR SUGESTÃO/i }))

    await vi.waitFor(() => {
      expect(onSuggested).toHaveBeenCalledTimes(1)
    })
    expect(onSuggested.mock.calls[0][0]).toMatchObject({
      name: 'Academia Nova',
      coordinates: null,
    })
  })

  it('habilita envio quando a cidade foi digitada sem selecionar sugestão', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillFormWithTypedCity(user)

    expect(screen.getByRole('button', { name: /ENVIAR SUGESTÃO/i })).toBeEnabled()
  })

  it('busca endereço pelo CEP e preenche os campos da academia', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderForm()

    await user.type(screen.getByPlaceholderText(/Smart Fit Boa Viagem/i), 'Academia Nova')
    await user.type(screen.getByLabelText('CEP'), '01310100')

    expect(await screen.findByDisplayValue('01310-100')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('SP')
    expect(await screen.findByDisplayValue('São Paulo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bela Vista')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Avenida Paulista')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ENVIAR SUGESTÃO/i })).toBeEnabled()
  })

  it('mantém visível o UF retornado pelo CEP mesmo fora das opções carregadas', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados', () =>
        HttpResponse.json([{ id: 35, sigla: 'SP', nome: 'São Paulo' }]),
      ),
      http.get('https://viacep.com.br/ws/:cep/json/', () =>
        HttpResponse.json({
          cep: '69005-040',
          logradouro: 'Avenida Eduardo Ribeiro',
          complemento: '',
          bairro: 'Centro',
          localidade: 'Manaus',
          uf: 'AM',
        }),
      ),
    )
    renderForm()

    await user.type(screen.getByPlaceholderText(/Smart Fit Boa Viagem/i), 'Academia Norte')
    await user.type(screen.getByLabelText('CEP'), '69005040')

    expect(await screen.findByDisplayValue('Manaus')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('AM')
    expect(screen.getByRole('option', { name: 'AM' })).toBeInTheDocument()
  })

  it('não mostra campos ou ações de coordenadas', () => {
    renderForm()

    expect(screen.queryByText(/Coordenadas/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /BUSCAR PELO ENDEREÇO/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /USAR LOCALIZAÇÃO/i })).not.toBeInTheDocument()
  })

  it('propaga falha de envio da sugestão', async () => {
    server.use(
      http.post('*/coach/gyms/suggest', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    const user = userEvent.setup()
    const { onSuggested } = renderForm()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /ENVIAR SUGESTÃO/i }))

    expect(await screen.findByText(/Não foi possível enviar a sugestão/i)).toBeInTheDocument()
    expect(onSuggested).not.toHaveBeenCalled()
  })

  it('aciona onCancel ao fechar', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()

    await user.click(screen.getByRole('button', { name: /Cancelar sugestão/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
