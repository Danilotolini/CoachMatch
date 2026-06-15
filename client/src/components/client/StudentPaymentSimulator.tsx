import { useMutation } from '@tanstack/react-query'
import { createPayment } from '@/api/payments'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { parseApiErrors } from '@/lib/http'

interface StudentPaymentSimulatorProps {
  scheduleId: string
  coachId: string
  studentId: string
  amountCents: number
  amountLabel: string
  onPaid: () => void
}

export function StudentPaymentSimulator({
  scheduleId,
  coachId,
  studentId,
  amountCents,
  amountLabel,
  onPaid,
}: StudentPaymentSimulatorProps) {
  const paymentMutation = useMutation({
    mutationFn: () =>
      createPayment({
        sessionId: scheduleId,
        coachId,
        studentId,
        amount: amountCents,
        method: 'pix',
      }),
    onSuccess: () => {
      onPaid()
    },
  })

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
              Pague esta aula via PIX para concluir o processo.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            paymentMutation.mutate()
          }}
          loading={paymentMutation.isPending}
          className="w-full py-3 sm:w-auto"
          icon="check_circle"
        >
          PAGAR {amountLabel}
        </Button>
      </div>

      {paymentMutation.isError ? (
        <p className="mt-2 font-label text-xs text-error">
          {parseApiErrors(paymentMutation.error, 'Não foi possível processar o pagamento.')}
        </p>
      ) : null}
    </div>
  )
}
