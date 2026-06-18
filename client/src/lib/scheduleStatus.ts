import type { ScheduleStatus } from '@/types/api'

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  AVAILABLE: 'Disponível',
  REQUESTED: 'Solicitado',
  BOOKED: 'Agendado',
  COMPLETED: 'Concluído',
  NOSHOW: 'Aluno ausente',
  CANCELLED: 'Cancelado',
}

export const SCHEDULE_STATUS_CHIP: Record<ScheduleStatus, string> = {
  AVAILABLE: 'bg-surface-container-high text-on-surface-variant',
  REQUESTED: 'bg-secondary-container text-on-secondary-container',
  BOOKED: 'bg-primary-container text-on-primary-container',
  COMPLETED: 'bg-tertiary-container text-on-tertiary-container',
  NOSHOW: 'bg-error-container text-on-error-container',
  CANCELLED: 'bg-surface-container-high text-on-surface-variant opacity-60',
}
