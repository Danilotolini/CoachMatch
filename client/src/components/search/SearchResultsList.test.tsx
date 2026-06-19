import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchResultsList, SearchResultsSkeleton } from './SearchResultsList'
import type { CoachSummary } from '@/types/api'

const coaches: CoachSummary[] = [
  {
    coachId: 'coach_1',
    profile: {
      name: 'Marcos Vieira',
      phone: null,
      specialties: ['Musculação', 'Mobilidade'],
      cref: 'CREF 0001-G/SP',
      instagram: '@marcos',
      profile_video: false,
    },
    work_location: [],
  },
  {
    coachId: 'coach_2',
    profile: {
      name: 'Ana Lima',
      phone: null,
      specialties: ['Corrida'],
      cref: null,
      instagram: null,
      profile_video: false,
    },
    work_location: [],
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
