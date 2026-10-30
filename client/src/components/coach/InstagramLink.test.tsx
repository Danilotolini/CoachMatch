import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstagramLink } from './InstagramLink'

describe('InstagramLink', () => {
  it('renderiza o handle como texto do link', () => {
    render(<InstagramLink handle="coachjoao" />)
    expect(screen.getByRole('link', { name: 'coachjoao' })).toBeInTheDocument()
  })

  it('aponta para o perfil público do Instagram', () => {
    render(<InstagramLink handle="coachjoao" />)
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://instagram.com/coachjoao',
    )
  })

  it('abre em nova aba com rel seguro', () => {
    render(<InstagramLink handle="coach" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('aceita className extra', () => {
    render(<InstagramLink handle="x" className="text-blue-500" />)
    expect(screen.getByRole('link').className).toContain('text-blue-500')
  })
})
