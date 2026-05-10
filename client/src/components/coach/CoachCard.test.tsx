import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoachCard } from './CoachCard'

describe('CoachCard', () => {
  it('renderiza nome e especialidades', () => {
    render(<CoachCard name="Marina Silva" specialties="Musculação · CrossFit" />)
    expect(screen.getByText('Marina Silva')).toBeInTheDocument()
    expect(screen.getByText('Musculação · CrossFit')).toBeInTheDocument()
  })

  it('dispara onClick ao clicar no card', async () => {
    const onClick = vi.fn()
    render(<CoachCard name="Marina" specialties="x" onClick={onClick} />)

    await userEvent.click(screen.getByRole('button', { name: /Marina/ }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('mostra RatingPill quando rating é fornecido', () => {
    render(<CoachCard name="x" specialties="y" rating={4.7} />)
    expect(screen.getByText('4.7')).toBeInTheDocument()
  })

  it('omite RatingPill quando rating é undefined', () => {
    render(<CoachCard name="x" specialties="y" />)
    expect(screen.queryByText(/^4\./)).not.toBeInTheDocument()
  })

  it('mostra preço quando price é fornecido', () => {
    render(<CoachCard name="x" specialties="y" price={150} />)
    expect(screen.getByText(/R\$ 150/)).toBeInTheDocument()
    expect(screen.getByText('/ sessão')).toBeInTheDocument()
  })

  it('omite preço quando price é undefined', () => {
    render(<CoachCard name="x" specialties="y" />)
    expect(screen.queryByText('/ sessão')).not.toBeInTheDocument()
  })

  it('aplica background image quando image é fornecida', () => {
    const { container } = render(
      <CoachCard name="x" specialties="y" image="http://test/img.jpg" />,
    )
    const imageDiv = container.querySelector('[style*="background-image"]') as HTMLElement | null
    expect(imageDiv).not.toBeNull()
    expect(imageDiv?.style.backgroundImage).toContain('http://test/img.jpg')
  })
})
