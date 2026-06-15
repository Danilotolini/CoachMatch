import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ClientCoachDetailPage from './ClientCoachDetailPage'
import { buildStudentCoachScheduleWindow } from './clientCoachDetailWindow'
import { apiPost } from '@/lib/http'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'

function renderClientCoachDetail(initialEntries = ['/client/coaches/coach_marcos']) {
  loginAs('client')
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryWrapper>
        <Routes>
          <Route path="/client/coaches/:coachId" element={<ClientCoachDetailPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('ClientCoachDetailPage', () => {
  beforeEach(async () => {
    await apiPost('/dev/reset')
  })

  it('renderiza detalhes do treinador e permite solicitar agendamento', async () => {
    renderClientCoachDetail()

    expect(await screen.findAllByRole('heading', { name: 'Marcos Vieira' })).toHaveLength(2)
    expect(screen.getByText('Musculação')).toBeInTheDocument()
    expect(await screen.findByText(/18:00-19:00/i)).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: /AGENDAR/i })[0])

    expect(
      await screen.findByText('Solicitação enviada. O treinador vai confirmar o agendamento.'),
    ).toBeInTheDocument()
  })

  it('gera a janela de busca com inicio e fim no fuso -03:00', () => {
    expect(buildStudentCoachScheduleWindow(new Date('2026-06-16T01:30:00Z'))).toEqual({
      startDateTime: '2026-06-15T00:00:00-03:00',
      endDateTime: '2026-07-06T23:59:59-03:00',
    })
  })
})
