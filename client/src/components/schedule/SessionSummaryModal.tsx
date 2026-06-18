import { Icon } from '@/components/ui/Icon'
import { formatScheduleDateTimeRange } from '@/lib/dateTime'
import { SCHEDULE_STATUS_CHIP, SCHEDULE_STATUS_LABELS } from '@/lib/scheduleStatus'
import type { Schedule } from '@/types/api'

type Viewer = 'coach' | 'client'

interface SessionSummaryModalProps {
  slot: Schedule
  viewer: Viewer
  /** Nome da contraparte: treinador (visão aluno) ou aluno (visão treinador). */
  counterpartName?: string | undefined
  specialtyLabel: string
  gymLabel?: string
  /** Abre a página detalhada da sessão. */
  onViewDetails?: () => void
  onClose: () => void
}

function formatMoney(value: string): string {
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount)
}

function paymentLabel(status: string | null): string | null {
  if (!status) return null
  if (status === 'PAID') return 'Pago'
  if (status === 'PENDING') return 'Pendente'
  return status.toLowerCase()
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <span className="min-w-0 truncate text-right font-label text-sm font-medium text-on-surface">
        {value}
      </span>
    </div>
  )
}

/**
 * Visão resumida e somente leitura de uma sessão, aberta ao clicar num horário
 * do calendário. Compartilhada entre aluno e treinador; a copy da contraparte
 * muda conforme `viewer`.
 */
export function SessionSummaryModal({
  slot,
  viewer,
  counterpartName,
  specialtyLabel,
  gymLabel,
  onViewDetails,
  onClose,
}: SessionSummaryModalProps) {
  const counterpartLabel = viewer === 'coach' ? 'Aluno' : 'Treinador'
  const title = counterpartName ?? (specialtyLabel || 'Sessão')
  // O treinador não vê o status de pagamento.
  const payment = viewer === 'coach' ? null : paymentLabel(slot.paymentStatus)
  // Só o treinador vê quantas solicitações pendentes a sessão tem.
  const pendingCount =
    viewer === 'coach' && slot.status === 'REQUESTED'
      ? (slot.requests?.filter((request) => request.status === 'REQUESTED').length ?? 0)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface/70 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex w-full max-w-md flex-col gap-5 rounded-xl border border-outline-variant/10 bg-surface-container p-5 shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-summary-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="session-summary-title"
              className="truncate font-headline text-lg font-semibold tracking-tight text-on-surface"
            >
              {title}
            </h2>
            <p className="mt-1 font-label text-xs text-on-surface-variant">
              {formatScheduleDateTimeRange(slot)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 font-label text-[10px] font-semibold uppercase ${SCHEDULE_STATUS_CHIP[slot.status]}`}
          >
            {SCHEDULE_STATUS_LABELS[slot.status]}
          </span>
        </div>

        <div className="flex flex-col gap-2.5 rounded-lg bg-surface-container-low p-4">
          {counterpartName && <DetailRow label={counterpartLabel} value={counterpartName} />}
          <DetailRow label="Especialidade" value={specialtyLabel || '—'} />
          {gymLabel && <DetailRow label="Academia" value={gymLabel} />}
          <DetailRow label="Valor" value={formatMoney(slot.price)} />
          {payment && <DetailRow label="Pagamento" value={payment} />}
          {pendingCount > 0 && (
            <DetailRow
              label="Solicitações"
              value={`${String(pendingCount)} ${pendingCount === 1 ? 'pendente' : 'pendentes'}`}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Fechar
          </button>
          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-label text-xs font-bold uppercase tracking-wide text-on-primary-fixed transition-all hover:brightness-110 active:scale-95"
            >
              Ver detalhes
              <Icon name="arrow_forward" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
