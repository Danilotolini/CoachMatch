import { useState } from 'react'
import { StudentPaymentModal } from '@/components/client/StudentPaymentModal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface StudentPaymentSimulatorProps {
  readonly scheduleId: string
  readonly coachId: string
  readonly studentId: string
  readonly amountCents: number
  readonly amountLabel: string
  readonly coachName?: string | undefined
  readonly specialtyLabel?: string | undefined
  readonly dateLabel?: string | undefined
  readonly onPaid: () => void
}

export function StudentPaymentSimulator({
  scheduleId,
  coachId,
  studentId,
  amountCents,
  amountLabel,
  coachName,
  specialtyLabel,
  dateLabel,
  onPaid,
}: StudentPaymentSimulatorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg bg-surface-container px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="payments" size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-headline text-sm font-semibold">Pagamento pendente</p>
            <p className="font-body text-xs text-on-surface-variant">
              Pague esta aula via PIX ou cartão para concluir o processo.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setOpen(true)
          }}
          className="w-full py-3 sm:w-auto"
          icon="check_circle"
        >
          PAGAR {amountLabel}
        </Button>
      </div>

      {open && (
        <StudentPaymentModal
          scheduleId={scheduleId}
          coachId={coachId}
          studentId={studentId}
          amountCents={amountCents}
          amountLabel={amountLabel}
          coachName={coachName}
          specialtyLabel={specialtyLabel}
          dateLabel={dateLabel}
          onPaid={onPaid}
          onClose={() => {
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
