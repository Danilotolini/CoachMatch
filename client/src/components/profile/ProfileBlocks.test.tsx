import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ProfileActionRow,
  ProfileHero,
  ProfileInfoGrid,
  ProfileLogoutButton,
  ProfileSection,
} from './ProfileBlocks'

describe('ProfileBlocks', () => {
  it('renderiza hero, grid e action row', () => {
    render(
      <>
        <ProfileHero
          eyebrow="Treinador"
          name="Marcos Vieira"
          email="marcos@example.com"
          initials="MV"
          meta={['São Paulo', 'Musculação']}
          statusLabel="Aprovado"
        />
        <ProfileInfoGrid
          items={[
            { label: 'Cidade', value: 'São Paulo' },
            { label: 'Experiência', value: '8 anos' },
          ]}
        />
        <ProfileActionRow
          icon="settings"
          title="Configurações"
          description="Ajuste notificações e conta"
          action="Abrir"
        />
      </>,
    )

    expect(screen.getByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getAllByText('São Paulo')).toHaveLength(2)
    expect(screen.getByText('Experiência')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /configurações ajuste notificações e conta abrir/i }),
    ).toBeInTheDocument()
  })

  it('renderiza a secao com e sem elementos opcionais', () => {
    const { rerender } = render(
      <ProfileSection
        title="Dados pessoais"
        description="Informações públicas"
        icon="person"
        aside={<button type="button">Editar</button>}
      >
        <p>Conteúdo</p>
      </ProfileSection>,
    )

    expect(screen.getByText('Informações públicas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    rerender(
      <ProfileSection title="Dados pessoais">
        <p>Conteúdo simples</p>
      </ProfileSection>,
    )

    expect(screen.queryByText('Informações públicas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.getByText('Conteúdo simples')).toBeInTheDocument()
  })

  it('dispara logout ao clicar no botao', () => {
    const onClick = vi.fn()
    render(<ProfileLogoutButton onClick={onClick} />)

    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByTitle('Sair da conta')).toBeInTheDocument()
  })
})
