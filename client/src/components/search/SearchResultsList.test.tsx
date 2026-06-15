import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchResultsList, SearchResultsSkeleton } from './SearchResultsList'
import type { CoachListItem } from '@/types/api'

const coaches: CoachListItem[] = [
  {
    coachId: 'coach_1',
    name: 'Marcos Vieira',
    specialties: ['Musculação', 'Mobilidade'],
    rating: 4.8,
    priceFrom: 180,
    city: 'São Paulo',
    neighborhood: 'Bela Vista',
    nextAvailability: 'Hoje',
    photo: 'https://example.com/photo.jpg',
  },
  {
    coachId: 'coach_2',
    name: 'Ana Lima',
    specialties: ['Corrida'],
    rating: 4.6,
    priceFrom: 140,
    city: 'Campinas',
    neighborhood: 'Cambuí',
    nextAvailability: 'Amanhã',
    photo: null,
  },
]

describe('SearchResultsList', () => {
  it('renderiza coaches com e sem callback de clique', () => {
    const onCoachClick = vi.fn()
    const { rerender } = render(<SearchResultsList coaches={coaches} onCoachClick={onCoachClick} />)

    fireEvent.click(screen.getByRole('button', { name: /marcos vieira/i }))
    expect(onCoachClick).toHaveBeenCalledWith('coach_1')

    rerender(<SearchResultsList coaches={coaches} />)

    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
  })

  it('renderiza o skeleton de carregamento', () => {
    render(<SearchResultsSkeleton />)

    expect(screen.getByLabelText('Carregando resultados')).toBeInTheDocument()
  })
})
