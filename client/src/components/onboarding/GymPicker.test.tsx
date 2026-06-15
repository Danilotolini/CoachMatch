import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GymPicker } from './GymPicker'

const useGymSearchMock = vi.fn()
const useInfiniteScrollMock = vi.fn()
const GymSuggestFormMock = vi.fn()

vi.mock('@/hooks/useGyms', () => ({
  useGymSearch: (search: string) => useGymSearchMock(search),
}))

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: (config: unknown) => useInfiniteScrollMock(config),
}))

vi.mock('./GymSuggestForm', () => ({
  GymSuggestForm: (props: {
    onCancel: () => void
    onSuggested: (gym: {
      gymId: string
      name: string
      city: string
      state: string
      neighborhood: string
    }) => void
  }) => {
    GymSuggestFormMock(props)
    return (
      <div>
        <button type="button" onClick={props.onCancel}>
          cancelar sugestao
        </button>
        <button
          type="button"
          onClick={() =>
            props.onSuggested({
              gymId: 'gym_suggested',
              name: 'Academia Nova',
              city: 'São Paulo',
              state: 'SP',
              neighborhood: 'Centro',
            })
          }
        >
          confirmar sugestao
        </button>
      </div>
    )
  },
}))

describe('GymPicker', () => {
  beforeEach(() => {
    useInfiniteScrollMock.mockReturnValue({
      rootRef: vi.fn(),
      sentinelRef: vi.fn(),
    })
    useGymSearchMock.mockImplementation((search: string) => {
      if (search === 'smart') {
        return {
          data: undefined,
          hasNextPage: false,
          fetchNextPage: vi.fn(),
          isFetchingNextPage: false,
          isLoading: true,
        }
      }
      if (search === 'nao existe') {
        return {
          data: { data: [] },
          hasNextPage: false,
          fetchNextPage: vi.fn(),
          isFetchingNextPage: false,
          isLoading: false,
        }
      }
      return {
        data: {
          data: [
            {
              gymId: 'gym_smartfit_paulista',
              name: 'Smart Fit Paulista',
              city: 'São Paulo',
              state: 'SP',
              neighborhood: 'Paulista',
            },
            {
              gymId: 'gym_bluefit_pinheiros',
              name: 'Bluefit Pinheiros',
              city: 'São Paulo',
              state: 'SP',
              neighborhood: 'Pinheiros',
            },
          ],
        },
        hasNextPage: true,
        fetchNextPage: vi.fn(),
        isFetchingNextPage: false,
        isLoading: false,
      }
    })
  })

  it('lista resultados de busca, exclui academias já selecionadas e adiciona nova academia', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(
      <GymPicker
        selectedGyms={[
          {
            id: 'gym_smartfit_paulista',
            name: 'Smart Fit Paulista',
            city: 'São Paulo',
            state: 'SP',
            neighborhood: 'Paulista',
          },
        ]}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    )

    await user.type(
      screen.getByPlaceholderText('Buscar por nome da academia ou bairro...'),
      'pinheiros',
    )

    expect(screen.getAllByText('Smart Fit Paulista')).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Bluefit Pinheiros/i })).toBeInTheDocument()
    expect(screen.getByText('Role para ver mais')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Bluefit Pinheiros/i }))

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ gymId: 'gym_bluefit_pinheiros' }))
  })

  it('mostra estados de loading, vazio, remoção e erro', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()

    const { rerender } = render(
      <GymPicker
        selectedGyms={[
          {
            id: 'gym_smartfit_paulista',
            name: 'Smart Fit Paulista',
            city: 'São Paulo',
            state: 'SP',
            neighborhood: 'Paulista',
          },
        ]}
        onAdd={vi.fn()}
        onRemove={onRemove}
        error="Selecione pelo menos uma academia"
      />,
    )

    await user.type(
      screen.getByPlaceholderText('Buscar por nome da academia ou bairro...'),
      'smart',
    )
    expect(screen.getByText('Buscando academias...')).toBeInTheDocument()
    expect(screen.getByText('Selecione pelo menos uma academia')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover Smart Fit Paulista' }))
    expect(onRemove).toHaveBeenCalledWith('gym_smartfit_paulista')

    rerender(<GymPicker selectedGyms={[]} onAdd={vi.fn()} onRemove={vi.fn()} error={undefined} />)

    const searchInput = screen.getByPlaceholderText('Buscar por nome da academia ou bairro...')
    await user.clear(searchInput)
    await user.type(searchInput, 'nao existe')
    expect(screen.getByText('Nenhuma academia encontrada')).toBeInTheDocument()
  })

  it('abre o formulário de sugestão, cancela e confirma academia sugerida', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<GymPicker selectedGyms={[]} onAdd={onAdd} onRemove={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'SUGERIR ACADEMIA' }))
    expect(GymSuggestFormMock).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'cancelar sugestao' }))
    expect(screen.getByRole('button', { name: 'SUGERIR ACADEMIA' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'SUGERIR ACADEMIA' }))
    await user.click(screen.getByRole('button', { name: 'confirmar sugestao' }))

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: 'gym_suggested', name: 'Academia Nova' }),
    )
    expect(screen.getByRole('button', { name: 'SUGERIR ACADEMIA' })).toBeInTheDocument()
  })
})
