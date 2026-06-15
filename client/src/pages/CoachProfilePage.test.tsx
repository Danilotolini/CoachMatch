import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachProfilePage from './CoachProfilePage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import { loginAs } from '@/test/session'
import type { Coach, CoachUpdatePayload } from '@/types/api'

const approvedCoach: Coach = {
  ...initialCoach,
  status: 'APPROVED',
  profile: {
    ...initialCoach.profile,
    name: 'Marina Silva',
    phone: '11999998888',
    cref: '123456-G/SP',
    instagram: '@marina.fit',
    specialties: ['MUSCULATION'],
  },
  work_location: [{ type: 'GYM', gymId: 'gym_smartfit_paulista' }],
}

function renderPage() {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter>
        <CoachProfilePage />
      </MemoryRouter>
    </QueryWrapper>,
  )
}

beforeEach(() => {
  loginAs('coach')
})

describe('CoachProfilePage', () => {
  it('carrega o perfil e salva alterações em PUT /coach/me', async () => {
    let receivedPayload: CoachUpdatePayload | null = null

    server.use(
      http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)),
      http.put('*/coach/me', async ({ request }) => {
        receivedPayload = (await request.json()) as CoachUpdatePayload
        return HttpResponse.json<Coach>({
          ...approvedCoach,
          profile: {
            ...approvedCoach.profile,
            ...receivedPayload.profile,
          },
          updatedAt: '2026-06-15T12:00:00Z',
        })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByDisplayValue('Marina Silva')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Pilates' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'Marina Costa')
    await user.clear(screen.getByLabelText('WhatsApp / telefone'))
    await user.type(screen.getByLabelText('WhatsApp / telefone'), '21988887777')
    await user.clear(screen.getByLabelText('Registro CREF'))
    await user.type(screen.getByLabelText('Registro CREF'), '654321-G/RJ')
    await user.clear(screen.getByLabelText('Instagram'))
    await user.type(screen.getByLabelText('Instagram'), 'marina.performance')
    await user.click(screen.getByRole('button', { name: 'Pilates' }))
    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    await waitFor(() => {
      expect(receivedPayload).toEqual({
        profile: {
          name: 'Marina Costa',
          phone: '21988887777',
          cref: '654321-G/RJ',
          instagram: '@marina.performance',
          specialties: ['MUSCULATION', 'PILATES'],
          profile_video: false,
        },
        work_location: [{ type: 'GYM', gymId: 'gym_smartfit_paulista' }],
      })
    })
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
  })

  it('adiciona e remove academias e envia work_location no PUT', async () => {
    let receivedPayload: CoachUpdatePayload | null = null

    server.use(
      http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)),
      http.put('*/coach/me', async ({ request }) => {
        receivedPayload = (await request.json()) as CoachUpdatePayload
        return HttpResponse.json<Coach>({
          ...approvedCoach,
          profile: { ...approvedCoach.profile, ...receivedPayload.profile },
          work_location: receivedPayload.work_location ?? approvedCoach.work_location,
          updatedAt: '2026-06-15T12:00:00Z',
        })
      }),
    )

    const user = userEvent.setup()
    renderPage()

    // academia existente é resolvida pelo nome via lista de academias
    expect(await screen.findByText('Smart Fit Paulista')).toBeInTheDocument()

    // busca e adiciona uma nova academia
    await user.type(
      screen.getByPlaceholderText('Buscar por nome da academia ou bairro...'),
      'Bluefit Pinheiros',
    )
    await user.click(await screen.findByText('Bluefit Pinheiros'))

    // remove a academia original
    await user.click(screen.getByRole('button', { name: 'Remover Smart Fit Paulista' }))

    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    await waitFor(() => {
      expect(receivedPayload?.work_location).toEqual([
        { type: 'GYM', gymId: 'gym_bluefit_pinheiros' },
      ])
    })
  })

  it('bloqueia o salvamento quando nenhuma academia está selecionada', async () => {
    let putCalled = false

    server.use(
      http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)),
      http.put('*/coach/me', () => {
        putCalled = true
        return HttpResponse.json<Coach>(approvedCoach)
      }),
    )

    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Remover Smart Fit Paulista' }))
    await user.click(screen.getByRole('button', { name: /SALVAR PERFIL/i }))

    expect(
      await screen.findByText('Selecione pelo menos uma academia parceira.'),
    ).toBeInTheDocument()
    expect(putCalled).toBe(false)
  })
})
