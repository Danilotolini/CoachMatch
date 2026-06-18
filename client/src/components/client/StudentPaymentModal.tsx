import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useCreatePayment } from '@/hooks/useCreatePayment'
import { parseApiErrors } from '@/lib/http'
import type { PaymentMethod } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type FlowStatus = 'idle' | 'loading' | 'approved' | 'refused'

interface CardForm {
  number: string
  holder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}

interface CardErrors {
  number?: string
  holder?: string
  expiry?: string
  cvv?: string
}

interface StudentPaymentModalProps {
  scheduleId: string
  coachId: string
  studentId: string
  amountCents: number
  amountLabel: string
  coachName?: string | undefined
  specialtyLabel?: string | undefined
  dateLabel?: string | undefined
  /** Chamado uma vez quando o pagamento é confirmado, ao fechar o modal. */
  onPaid: () => void
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function validateCard(form: CardForm): CardErrors {
  const errors: CardErrors = {}
  const digits = form.number.replace(/\s/g, '')
  if (digits.length !== 16) errors.number = 'Número deve ter 16 dígitos.'
  if (form.holder.trim().length < 3) errors.holder = 'Nome muito curto.'
  if (!form.expiryMonth || !form.expiryYear) errors.expiry = 'Validade inválida.'
  if (form.cvv.length < 3) errors.cvv = 'CVV inválido.'
  return errors
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-label text-xs uppercase tracking-widest text-on-surface-variant">
      {children}
    </span>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 font-body text-xs text-error">
      <Icon name="error" size={14} />
      {message}
    </p>
  )
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className = '', ...rest } = props
  return (
    <input
      {...rest}
      className={[
        'w-full rounded-t-lg border-b-2 bg-surface-container-highest px-4 py-3',
        'font-body text-sm text-on-surface placeholder-on-surface-variant/40',
        'transition-colors focus:border-primary focus:outline-none',
        hasError ? 'border-error' : 'border-outline-variant/40',
        className,
      ].join(' ')}
    />
  )
}

function PixPanel({
  amountLabel,
  onConfirm,
  loading,
}: {
  amountLabel: string
  onConfirm: () => void
  loading: boolean
}) {
  const mockPixCode = 'pix_mock_00020126580014br.gov.bcb.pix0136mock-uuid'

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-highest">
          <div className="absolute inset-3 grid grid-cols-8 grid-rows-8 gap-0.5 opacity-60">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-sm ${(i * 7 + 3) % 3 === 0 ? 'bg-on-surface' : 'bg-transparent'}`}
              />
            ))}
          </div>
          <Icon name="qr_code_2" size={36} filled className="z-10 text-primary drop-shadow-lg" />
        </div>
        <div>
          <p className="font-headline text-2xl font-bold text-primary">{amountLabel}</p>
          <p className="mt-1 font-body text-xs text-on-surface-variant">Válido por 30 minutos</p>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
        <p className="mb-2 font-label text-xs uppercase tracking-widest text-on-surface-variant">
          Código PIX Copia e Cola
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-surface-container-highest px-3 py-2 font-mono text-xs text-on-surface-variant">
            {mockPixCode}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(mockPixCode)
            }}
            className="rounded-lg bg-surface-container-highest p-2 transition-colors hover:bg-surface-bright"
            title="Copiar código"
            aria-label="Copiar código PIX"
          >
            <Icon name="content_copy" size={20} className="text-primary" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {[
          'Abra o app do seu banco',
          'Acesse a área PIX',
          'Escaneie o QR ou cole o código',
          'Confirme o pagamento',
        ].map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <span className="font-label text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <span className="font-body text-sm text-on-surface-variant">{step}</span>
          </div>
        ))}
      </div>

      <Button
        type="button"
        loading={loading}
        onClick={onConfirm}
        icon="check_circle"
        className="w-full"
      >
        {loading ? 'Confirmando...' : 'Já realizei o pagamento'}
      </Button>
    </div>
  )
}

function CardPanel({
  amountLabel,
  onSubmit,
  loading,
}: {
  amountLabel: string
  onSubmit: (card: CardForm) => void
  loading: boolean
}) {
  const [form, setForm] = useState<CardForm>({
    number: '',
    holder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  })
  const [errors, setErrors] = useState<CardErrors>({})

  function handleNumberChange(value: string) {
    setForm((f) => ({ ...f, number: formatCardNumber(value) }))
  }

  function handleExpiryChange(value: string) {
    const formatted = formatExpiry(value)
    const parts = formatted.split('/')
    setForm((f) => ({
      ...f,
      expiryMonth: parts[0] ?? '',
      expiryYear: parts[1] ? `20${parts[1]}` : '',
    }))
  }

  function handleSubmit() {
    const errs = validateCard(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSubmit(form)
  }

  const expiryDisplay = form.expiryMonth
    ? `${form.expiryMonth}${form.expiryYear ? `/${form.expiryYear.slice(2)}` : ''}`
    : ''

  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
        <div>
          <Label>Número do Cartão</Label>
          <div className="relative">
            <FieldInput
              type="text"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={form.number}
              onChange={(e) => {
                handleNumberChange(e.target.value)
              }}
              hasError={!!errors.number}
            />
            <Icon
              name="credit_card"
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
          </div>
          {errors.number && <FieldError message={errors.number} />}
          <p className="mt-1.5 font-body text-[11px] text-on-surface-variant/60">
            Cartões de teste: <span className="font-mono text-primary/70">4111 1111 1111 1111</span>{' '}
            (aprovado) · <span className="font-mono text-error/70">4222 2222 2222 2222</span>{' '}
            (recusado)
          </p>
        </div>

        <div>
          <Label>Nome do Titular</Label>
          <FieldInput
            type="text"
            placeholder="Como está no cartão"
            value={form.holder}
            onChange={(e) => {
              setForm((f) => ({ ...f, holder: e.target.value.toUpperCase() }))
            }}
            hasError={!!errors.holder}
          />
          {errors.holder && <FieldError message={errors.holder} />}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Validade</Label>
            <FieldInput
              type="text"
              inputMode="numeric"
              placeholder="MM/AA"
              value={expiryDisplay}
              onChange={(e) => {
                handleExpiryChange(e.target.value)
              }}
              hasError={!!errors.expiry}
            />
            {errors.expiry && <FieldError message={errors.expiry} />}
          </div>
          <div>
            <Label>CVV</Label>
            <FieldInput
              type="text"
              inputMode="numeric"
              placeholder="000"
              maxLength={4}
              value={form.cvv}
              onChange={(e) => {
                setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, '') }))
              }}
              hasError={!!errors.cvv}
            />
            {errors.cvv && <FieldError message={errors.cvv} />}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Icon name="lock" size={16} className="text-on-surface-variant" />
        <p className="font-body text-xs text-on-surface-variant">
          Dados criptografados · Cartão nunca trafega pelo servidor
        </p>
      </div>

      <Button type="button" loading={loading} onClick={handleSubmit} icon="lock" className="w-full">
        {loading ? 'Processando...' : `Pagar ${amountLabel}`}
      </Button>
    </div>
  )
}

function PaymentResult({
  status,
  amountLabel,
  coachName,
  dateLabel,
  onRetry,
  onDone,
}: {
  status: 'approved' | 'refused'
  amountLabel: string
  coachName?: string | undefined
  dateLabel?: string | undefined
  onRetry: () => void
  onDone: () => void
}) {
  const config =
    status === 'approved'
      ? {
          icon: 'check_circle',
          iconColor: 'text-primary',
          bg: 'bg-primary/10',
          title: 'Pagamento Confirmado!',
          description: `${amountLabel} processados com sucesso. Seu treino está agendado.`,
        }
      : {
          icon: 'cancel',
          iconColor: 'text-error',
          bg: 'bg-error/10',
          title: 'Pagamento Recusado',
          description: 'Verifique os dados do cartão ou tente outro método de pagamento.',
        }

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${config.bg}`}>
        <Icon name={config.icon} size={48} filled className={config.iconColor} />
      </div>

      <div>
        <h2 className="mb-2 font-headline text-2xl font-bold text-on-surface">{config.title}</h2>
        <p className="font-body text-sm text-on-surface-variant">{config.description}</p>
      </div>

      {status === 'approved' && (coachName ?? dateLabel) && (
        <div className="w-full space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
          {dateLabel && (
            <div className="flex items-center gap-3">
              <Icon name="calendar_today" size={20} className="text-primary" />
              <div className="text-left">
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  Sessão
                </p>
                <p className="font-headline text-sm font-semibold text-on-surface">{dateLabel}</p>
              </div>
            </div>
          )}
          {coachName && (
            <div className="flex items-center gap-3">
              <Icon name="person" size={20} className="text-primary" />
              <div className="text-left">
                <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                  Treinador
                </p>
                <p className="font-headline text-sm font-semibold text-on-surface">{coachName}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'refused' ? (
        <Button type="button" onClick={onRetry} className="w-full">
          Tentar novamente
        </Button>
      ) : (
        <Button type="button" onClick={onDone} icon="arrow_forward" className="w-full">
          Concluir
        </Button>
      )}
    </div>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function StudentPaymentModal({
  scheduleId,
  coachId,
  studentId,
  amountCents,
  amountLabel,
  coachName,
  specialtyLabel,
  dateLabel,
  onPaid,
  onClose,
}: StudentPaymentModalProps) {
  const createPaymentMutation = useCreatePayment()

  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [status, setStatus] = useState<FlowStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const loading = createPaymentMutation.isPending
  const showResult = status === 'approved' || status === 'refused'

  // Após confirmar, avisa o pai (que invalida a agenda) só ao fechar, para a
  // tela de sucesso não desmontar junto com o cartão de pagamento pendente.
  function handleClose() {
    if (status === 'approved') onPaid()
    onClose()
  }

  function runPayment(method: PaymentMethod, card?: CardForm) {
    setError(null)
    setStatus('loading')

    createPaymentMutation.mutate(
      method === 'credit_card' && card
        ? {
            sessionId: scheduleId,
            method: 'credit_card',
            amount: amountCents,
            coachId,
            studentId,
            card: {
              number: card.number,
              holder: card.holder,
              expiryMonth: card.expiryMonth,
              expiryYear: card.expiryYear,
              cvv: card.cvv,
            },
          }
        : { sessionId: scheduleId, method: 'pix', amount: amountCents, coachId, studentId },
      {
        onSuccess: (result) => {
          setStatus(result.status === 'refused' ? 'refused' : 'approved')
        },
        onError: (err) => {
          setError(parseApiErrors(err, 'Não foi possível processar o pagamento.'))
          setStatus('idle')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-surface/70 px-4 pb-4 pt-safe backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={handleClose}
      />
      <div
        className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-payment-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/10 p-5">
          <div className="min-w-0">
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              CoachMatch · Pagamento
            </span>
            <h2
              id="student-payment-title"
              className="mt-1 font-headline text-lg font-semibold tracking-tight text-on-surface"
            >
              Confirme sua sessão
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar pagamento"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {error && (
            <div className="flex gap-3 rounded-lg border border-error/30 bg-error/10 p-4">
              <Icon name="error" size={20} className="shrink-0 text-error" />
              <p className="font-body text-sm text-error">{error}</p>
            </div>
          )}

          {showResult ? (
            <PaymentResult
              status={status}
              amountLabel={amountLabel}
              coachName={coachName}
              dateLabel={dateLabel}
              onRetry={() => {
                setStatus('idle')
                setError(null)
              }}
              onDone={handleClose}
            />
          ) : (
            <>
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                {coachName && (
                  <p className="font-headline text-base font-semibold text-on-surface">
                    {coachName}
                  </p>
                )}
                {specialtyLabel && (
                  <p className="font-body text-xs text-on-surface-variant">{specialtyLabel}</p>
                )}
                {dateLabel && (
                  <p className="mt-2 flex items-center gap-1.5 font-body text-sm text-on-surface-variant">
                    <Icon name="calendar_today" size={16} className="text-primary" />
                    {dateLabel}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-3">
                  <span className="font-headline text-sm font-bold text-on-surface">Total</span>
                  <span className="font-headline text-base font-bold text-primary">
                    {amountLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'pix' as const, icon: 'qr_code_2', label: 'PIX', badge: 'Instantâneo' },
                  { id: 'credit_card' as const, icon: 'credit_card', label: 'Cartão', badge: null },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMethod(opt.id)
                    }}
                    className={[
                      'rounded-xl border p-4 text-left transition-all',
                      method === opt.id
                        ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(244,255,198,0.3)]'
                        : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50',
                    ].join(' ')}
                  >
                    <Icon
                      name={opt.icon}
                      size={24}
                      className={method === opt.id ? 'text-primary' : 'text-on-surface-variant'}
                    />
                    <p
                      className={`mt-2 font-headline text-sm font-semibold ${method === opt.id ? 'text-on-surface' : 'text-on-surface-variant'}`}
                    >
                      {opt.label}
                    </p>
                    {opt.badge && (
                      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider text-primary">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {method === 'pix' ? (
                <PixPanel
                  amountLabel={amountLabel}
                  onConfirm={() => {
                    runPayment('pix')
                  }}
                  loading={loading}
                />
              ) : (
                <CardPanel
                  amountLabel={amountLabel}
                  onSubmit={(card) => {
                    runPayment('credit_card', card)
                  }}
                  loading={loading}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
