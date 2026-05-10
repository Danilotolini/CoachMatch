import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeServiceAreaPicker } from './HomeServiceAreaPicker'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { createWrapper } from '@/test/createWrapper'

function renderPicker() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <HomeServiceAreaPicker />
    </Wrapper>,
  )
}

beforeEach(() => {
  useOnboardingStore.getState().reset()
})

describe('HomeServiceAreaPicker', () => {
  it('mostra título "Nova área" quando ainda não há áreas', () => {
    renderPicker()
    expect(screen.getByText(/Nova área de atendimento/i)).toBeInTheDocument()
  })

  it('mantém a busca de cidade desabilitada até selecionar estado', async () => {
    renderPicker()
    await screen.findByRole('option', { name: /São Paulo \(SP\)/i })
    const cityInput = screen.getByPlaceholderText(/Selecione um estado primeiro/i)
    expect(cityInput).toBeDisabled()
  })

  it('botão ADICIONAR ÁREA fica desabilitado sem bairros', async () => {
    renderPicker()
    const button = await screen.findByRole('button', { name: /ADICIONAR ÁREA/i })
    expect(button).toBeDisabled()
  })

  it('adiciona uma área completa e a exibe na lista', async () => {
    const user = userEvent.setup()
    renderPicker()

    // espera estados carregarem
    await screen.findByRole('option', { name: /São Paulo \(SP\)/i })
    await user.selectOptions(screen.getByRole('combobox'), 'SP')

    const cityInput = await screen.findByPlaceholderText(/Digite para buscar/i)
    await user.click(cityInput)
    await user.type(cityInput, 'São Paulo')
    // seleciona a opção do dropdown
    const option = await screen.findByRole('button', { name: 'São Paulo' })
    await user.click(option)

    // espera input de bairro aparecer e digita
    const ruaInput = await screen.findByPlaceholderText(/Digite uma rua/i)
    await user.type(ruaInput, 'Paulista')

    // bairro chega via ViaCEP mock: "Bela Vista"
    const bairroBtn = await screen.findByRole('button', { name: 'Bela Vista' })
    await user.click(bairroBtn)

    const addBtn = screen.getByRole('button', { name: /ADICIONAR ÁREA/i })
    expect(addBtn).not.toBeDisabled()
    await user.click(addBtn)

    // item adicionado
    expect(await screen.findByText('São Paulo - SP')).toBeInTheDocument()
    expect(screen.getByText('1 bairro')).toBeInTheDocument()
    expect(useOnboardingStore.getState().form.homeAreas).toHaveLength(1)
  })

  it('remove uma área da lista', async () => {
    const user = userEvent.setup()
    useOnboardingStore.getState().addHomeArea({
      state: 'SP',
      city: 'São Paulo',
      neighborhoods: ['Bela Vista'],
    })

    renderPicker()

    expect(screen.getByText('São Paulo - SP')).toBeInTheDocument()

    const remove = screen.getByRole('button', { name: /Remover área São Paulo/i })
    await user.click(remove)

    expect(screen.queryByText('São Paulo - SP')).not.toBeInTheDocument()
    expect(useOnboardingStore.getState().form.homeAreas).toHaveLength(0)
  })

  it('mostra mensagem de duplicidade ao tentar adicionar cidade já existente', async () => {
    const user = userEvent.setup()
    useOnboardingStore.getState().addHomeArea({
      state: 'SP',
      city: 'São Paulo',
      neighborhoods: ['Bela Vista'],
    })

    renderPicker()

    await screen.findByRole('option', { name: /São Paulo \(SP\)/i })
    await user.selectOptions(screen.getByRole('combobox'), 'SP')

    const cityInput = await screen.findByPlaceholderText(/Digite para buscar/i)
    await user.click(cityInput)
    await user.type(cityInput, 'São Paulo')
    const listbox = await screen.findByRole('button', { name: 'São Paulo' })
    await user.click(listbox)

    expect(
      await screen.findByText(/Já existe uma área para São Paulo - SP/i),
    ).toBeInTheDocument()
  })

  it('mostra os bairros já selecionados na lista existente', () => {
    useOnboardingStore.getState().addHomeArea({
      state: 'SP',
      city: 'São Paulo',
      neighborhoods: ['Bela Vista', 'Pinheiros'],
    })

    renderPicker()

    const list = screen.getByText('São Paulo - SP').closest('li')!
    expect(within(list).getByText('Bela Vista')).toBeInTheDocument()
    expect(within(list).getByText('Pinheiros')).toBeInTheDocument()
    expect(within(list).getByText('2 bairros')).toBeInTheDocument()
  })
})
