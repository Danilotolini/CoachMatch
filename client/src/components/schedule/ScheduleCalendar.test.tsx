import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ScheduleCalendar from './ScheduleCalendar'
import type { Schedule } from '@/types/api'

// Sábado, 13 jun 2026, ao meio-dia (local)
const JUNE_13_2026 = new Date('2026-06-13T12:00:00')
// Sábado, 27 jun 2026 — último dia da semana jun 22–28
const JUNE_27_2026 = new Date('2026-06-27T12:00:00')
// Domingo, 28 jun 2026 — semana cruza julho (jun 28 – jul 4)
const JUNE_28_2026 = new Date('2026-06-28T12:00:00')

function makeSlot(overrides: Partial<Schedule> = {}): Schedule {
  return {
    scheduleId: 'slot-1',
    coachId: 'coach-1',
    gymId: 'gym-1',
    specialtyId: 'specialty-1',
    startDateTime: '2026-06-13T10:00:00-03:00',
    endDateTime: '2026-06-13T11:00:00-03:00',
    price: '100.00',
    status: 'AVAILABLE',
    studentId: null,
    paymentStatus: null,
    rating: null,
    studentComment: null,
    requests: null,
    createdAt: '2026-06-13T09:00:00-03:00',
    updatedAt: '2026-06-13T09:00:00-03:00',
    ...overrides,
  }
}

const LABELS = new Map([['specialty-1', 'Musculação']])
const NO_LABELS = new Map<string, string>()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(JUNE_13_2026)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ScheduleCalendar', () => {
  describe('filtragem por visibleStatuses', () => {
    it('não renderiza slot cujo status não está em visibleStatuses', () => {
      render(
        <ScheduleCalendar
          slots={[makeSlot({ status: 'AVAILABLE' })]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['BOOKED']}
        />,
      )

      // TimeGutter exibe "10h"; slot exibe "10:00–11:00"; formatos distintos
      expect(screen.queryByText('10:00–11:00')).toBeNull()
    })

    it('renderiza slot cujo status está em visibleStatuses', () => {
      render(
        <ScheduleCalendar
          slots={[makeSlot({ status: 'AVAILABLE' })]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['AVAILABLE']}
        />,
      )

      // Slot de 1h → height=72px → exibe "startH–endH"
      expect(screen.getAllByText('10:00–11:00').length).toBeGreaterThan(0)
    })
  })

  describe('callback onSlotClick', () => {
    it('chama onSlotClick com o slot correto ao clicar', () => {
      const slot = makeSlot()
      const onSlotClick = vi.fn()

      render(
        <ScheduleCalendar
          slots={[slot]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['AVAILABLE']}
          onSlotClick={onSlotClick}
        />,
      )

      fireEvent.click(screen.getAllByRole('button', { name: '10:00–11:00' })[0])

      expect(onSlotClick).toHaveBeenCalledWith(slot)
    })

    it('não lança erro quando onSlotClick não é passado', () => {
      render(
        <ScheduleCalendar
          slots={[makeSlot()]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['AVAILABLE']}
        />,
      )

      expect(() =>
        fireEvent.click(screen.getAllByRole('button', { name: '10:00–11:00' })[0]),
      ).not.toThrow()
    })
  })

  describe('exibição de specialty label', () => {
    it('exibe specialty label em slots com duração de 1h (height ≥ 60px)', () => {
      // 1h → height=72px → exibe startH–endH + specialty label
      render(
        <ScheduleCalendar
          slots={[makeSlot()]}
          specialtyLabels={LABELS}
          visibleStatuses={['AVAILABLE']}
        />,
      )

      expect(screen.getAllByText('Musculação').length).toBeGreaterThan(0)
    })

    it('não exibe specialty label em slots curtos (< 30min)', () => {
      // ~25min → height=max(26, 30)=30px → isShort → só startH, sem specialty
      render(
        <ScheduleCalendar
          slots={[makeSlot({ endDateTime: '2026-06-13T10:25:00-03:00' })]}
          specialtyLabels={LABELS}
          visibleStatuses={['AVAILABLE']}
        />,
      )

      expect(screen.queryByText('Musculação')).toBeNull()
    })
  })

  describe('legenda', () => {
    it('exibe apenas os labels dos status em visibleStatuses', () => {
      render(
        <ScheduleCalendar
          slots={[]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['AVAILABLE', 'BOOKED']}
        />,
      )

      expect(screen.getByText('Disponível')).toBeInTheDocument()
      expect(screen.getByText('Agendado')).toBeInTheDocument()
      expect(screen.queryByText('Cancelado')).toBeNull()
      expect(screen.queryByText('Solicitado')).toBeNull()
    })
  })

  describe('navegação mobile de dias', () => {
    it('avança para o próximo dia ao clicar em "Próximo dia"', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      expect(screen.getByText('Sáb, 13 jun')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }))

      expect(screen.getByText('Dom, 14 jun')).toBeInTheDocument()
    })

    it('volta para o dia anterior ao clicar em "Dia anterior"', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      fireEvent.click(screen.getByRole('button', { name: 'Dia anterior' }))

      expect(screen.getByText('Sex, 12 jun')).toBeInTheDocument()
    })

    it('mostra contador de horários do dia ativo', () => {
      render(
        <ScheduleCalendar
          slots={[makeSlot(), makeSlot({ scheduleId: 'slot-2' })]}
          specialtyLabels={NO_LABELS}
          visibleStatuses={['AVAILABLE']}
        />,
      )

      expect(screen.getByText('2 horários')).toBeInTheDocument()
    })
  })

  describe('"Ir para hoje" (mobile)', () => {
    it('não aparece quando o dia ativo é hoje', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      expect(screen.queryByText('Ir para hoje')).toBeNull()
    })

    it('aparece ao navegar para outro dia e some ao clicar', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }))
      expect(screen.getByText('Ir para hoje')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Ir para hoje'))
      expect(screen.queryByText('Ir para hoje')).toBeNull()
    })
  })

  describe('sincronização mobile ↔ desktop', () => {
    it('navegar dia no mobile para outra semana atualiza o weekStart do desktop', () => {
      // sáb 27 jun → semana dom 22–sáb 28 → label "jun 2026"
      vi.setSystemTime(JUNE_27_2026)
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      expect(screen.getByText('jun 2026')).toBeInTheDocument()

      // próximo dia = dom 28 jun → cruza para a semana 28 jun – 4 jul
      fireEvent.click(screen.getByRole('button', { name: 'Próximo dia' }))

      expect(screen.getByText('jun – jul 2026')).toBeInTheDocument()
    })

    it('navegar semana no desktop atualiza o activeDay do mobile', () => {
      // dom 28 jun → activeDay mobile exibe "Dom, 28 jun"
      vi.setSystemTime(JUNE_28_2026)
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      expect(screen.getByText('Dom, 28 jun')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))

      // activeDay avança 7 dias → dom 5 jul
      expect(screen.getByText('Dom, 5 jul')).toBeInTheDocument()
    })
  })

  describe('navegação semanal desktop', () => {
    beforeEach(() => {
      // Semana de jun 28 – jul 4: weekLabel inicial "jun – jul 2026"
      vi.setSystemTime(JUNE_28_2026)
    })

    it('exibe rótulo de semana que cruza mês', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      expect(screen.getByText('jun – jul 2026')).toBeInTheDocument()
    })

    it('avança o rótulo de semana ao clicar em "Próxima semana"', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))

      expect(screen.getByText('jul 2026')).toBeInTheDocument()
    })

    it('volta o rótulo de semana ao clicar em "Semana anterior"', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }))

      expect(screen.getByText('jun 2026')).toBeInTheDocument()
    })

    it('botão "Hoje" retorna para a semana atual', () => {
      render(<ScheduleCalendar slots={[]} specialtyLabels={NO_LABELS} visibleStatuses={[]} />)

      fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
      expect(screen.getByText('jul 2026')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Hoje' }))
      expect(screen.getByText('jun – jul 2026')).toBeInTheDocument()
    })
  })
})
