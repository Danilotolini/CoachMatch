import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatAvatar } from './ChatAvatar'

describe('ChatAvatar', () => {
  it('renderiza a foto quando image é fornecida', () => {
    render(<ChatAvatar name="João" image="https://example.com/foto.jpg" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/foto.jpg')
    expect(img).toHaveAttribute('alt', 'João')
  })

  it('usa texto da pessoa como alt da foto', () => {
    render(<ChatAvatar name="  Ana  " image="https://example.com/a.jpg" />)
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Ana')
  })

  it('usa alt genérico quando name está vazio com imagem', () => {
    render(<ChatAvatar image="https://example.com/a.jpg" />)
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Foto de perfil')
  })

  it('renderiza ícone quando não há imagem', () => {
    const { container } = render(<ChatAvatar name="Maria" />)
    expect(container.textContent).toContain('person')
  })
})
