import { Card } from '@/components/ui/Card'
import { formatScheduleDateTimeRange } from '@/lib/dateTime'
import { SCHEDULE_STATUS_CHIP, SCHEDULE_STATUS_LABELS } from '@/lib/scheduleStatus'
import type { Schedule } from '@/types/api'

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-label text-xs text-on-surface-variant">{label}</span>
      <span className="min-w-0 truncate text-right font-label text-sm font-medium text-on-surface">
        {value}
      </span>
    </div>
  )
}

export function SessionSummaryCard({
  slot,
  specialtyLabel,
  gymLabel,
  showPayment = true,
}: {
  slot: Schedule
  specialtyLabel: string
  gymLabel?: string | undefined
  /** O treinador não vê o status de pagamento. */
  showPayment?: boolean
}) {
  const payment = showPayment ? paymentLabel(slot.paymentStatus) : null

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Sessão
          </span>
          <p className="mt-0.5 font-headline text-lg font-semibold tracking-tight text-on-surface">
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
        <Row label="Especialidade" value={specialtyLabel || '—'} />
        {gymLabel && <Row label="Academia" value={gymLabel} />}
        <Row label="Valor" value={formatMoney(slot.price)} />
        {payment && <Row label="Pagamento" value={payment} />}
      </div>
    </Card>
  )
}
