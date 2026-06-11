import { useState } from 'react'
import { useParams } from 'react-router'
import { ProgressHeader } from '@/components/layout/ProgressHeader'
import { useCreatePayment } from '@/hooks/useCreatePayment'
import { useCoachMe } from '@/hooks/useCoachMe'
import type { PaymentMethod, CardInfo } from '@/types/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type CardStatus = 'idle' | 'loading' | 'approved' | 'refused' | 'pending'

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

function centsToReal(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Mock de sessão / coach ───────────────────────────────────────────────────

const MOCK_SESSION = {
  coachName: 'Marcos V.',
  specialty: 'Musculação · Hipertrofia',
  date: 'Sáb, 24 Jan · 08h00',
  duration: '60 min',
  amount: 18000,
  platformFee: 1800,
  coachAmount: 16200,
  sessionId: 'session_mock_001', // Session ID for mock
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline text-xl font-semibold text-on-surface border-l-4 border-primary pl-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1 font-body text-xs text-error flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">error</span>
      {message}
    </p>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-label text-xs text-on-surface-variant uppercase tracking-widest mb-1.5">
      {children}
    </span>
  )
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, className = '', ...rest } = props
  return (
    <input
      {...rest}
      className={[
        'w-full bg-surface-container-highest rounded-t-lg border-b-2 px-4 py-3',
        'font-body text-sm text-on-surface placeholder-on-surface-variant/40',
        'focus:outline-none focus:border-primary transition-colors',
        hasError ? 'border-error' : 'border-outline-variant/40',
        className,
      ].join(' ')}
    />
  )
}

// ─── Tela de resultado ────────────────────────────────────────────────────────

function PaymentResult({
  status,
  amount,
  onRetry,
}: {
  status: 'approved' | 'refused' | 'pending'
  amount: number
  onRetry: () => void
}) {
  const configs = {
    approved: {
      icon: 'check_circle',
      iconColor: 'text-primary',
      bg: 'bg-primary/10',
      title: 'Pagamento Confirmado!',
      description: `${centsToReal(amount)} processados com sucesso. Seu treino está agendado.`,
      cta: null as string | null,
    },
    refused: {
      icon: 'cancel',
      iconColor: 'text-error',
      bg: 'bg-error/10',
      title: 'Pagamento Recusado',
      description: 'Verifique os dados do cartão ou tente outro método de pagamento.',
      cta: 'Tentar novamente' as string | null,
    },
    pending: {
      icon: 'pending',
      iconColor: 'text-tertiary',
      bg: 'bg-tertiary/10',
      title: 'Aguardando Confirmação',
      description: 'Seu pagamento está em análise. Você será notificado em breve.',
      cta: null as string | null,
    },
  }

  const c = configs[status]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 max-w-sm mx-auto">
      <div className={`w-20 h-20 rounded-full ${c.bg} flex items-center justify-center`}>
        <span
          className={`material-symbols-outlined text-5xl ${c.iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {c.icon}
        </span>
      </div>

      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">{c.title}</h2>
        <p className="font-body text-sm text-on-surface-variant">{c.description}</p>
      </div>

      {status === 'approved' && (
        <div className="w-full bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
            <div className="text-left">
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
                Sessão
              </p>
              <p className="font-headline text-sm font-semibold text-on-surface">
                {MOCK_SESSION.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">person</span>
            <div className="text-left">
              <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest">
                Coach
              </p>
              <p className="font-headline text-sm font-semibold text-on-surface">
                {MOCK_SESSION.coachName}
              </p>
            </div>
          </div>
        </div>
      )}

      {c.cta !== null && (
        <button
          type="button"
          onClick={onRetry}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-headline font-bold py-4 rounded-lg uppercase tracking-wide hover:brightness-105 transition-all active:scale-[0.98]"
        >
          {c.cta}
        </button>
      )}

      {status !== 'refused' && (
        <a
          href="/dashboard"
          className="text-primary font-label text-sm hover:underline underline-offset-4"
        >
          Ir para o Dashboard →
        </a>
      )}
    </div>
  )
}

// ─── PIX panel ────────────────────────────────────────────────────────────────

function PixPanel({
  amount,
  onConfirm,
  loading,
}: {
  amount: number
  onConfirm: () => void
  loading: boolean
}) {
  const mockPixCode = 'pix_mock_00020126580014br.gov.bcb.pix0136mock-uuid'

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20 flex flex-col items-center gap-4 text-center">
        <div className="w-40 h-40 bg-surface-container-highest rounded-xl flex items-center justify-center border border-outline-variant/20 relative overflow-hidden">
          <div className="absolute inset-3 grid grid-cols-8 grid-rows-8 gap-0.5 opacity-60">
            {Array.from({ length: 64 }).map((_, i) => (
              <div
                key={i}
                // eslint-disable-next-line react-hooks/purity
                className={`rounded-sm ${Math.random() > 0.5 ? 'bg-on-surface' : 'bg-transparent'}`}
              />
            ))}
          </div>
          <span
            className="material-symbols-outlined text-primary text-4xl z-10 drop-shadow-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            qr_code_2
          </span>
        </div>

        <div>
          <p className="font-headline text-2xl font-bold text-primary">{centsToReal(amount)}</p>
          <p className="font-body text-xs text-on-surface-variant mt-1">Válido por 30 minutos</p>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
        <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest mb-2">
          Código PIX Copia e Cola
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-xs text-on-surface-variant truncate bg-surface-container-highest px-3 py-2 rounded-lg">
            {mockPixCode}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(mockPixCode)
            }}
            className="p-2 rounded-lg bg-surface-container-highest hover:bg-surface-bright transition-colors"
            title="Copiar código"
          >
            <span className="material-symbols-outlined text-primary text-xl">content_copy</span>
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
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="font-label text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <span className="font-body text-sm text-on-surface-variant">{step}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onConfirm}
        className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-base py-4 rounded-lg uppercase tracking-wide shadow-[0_10px_30px_rgba(244,255,198,0.15)] hover:shadow-[0_10px_40px_rgba(244,255,198,0.25)] hover:brightness-105 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-on-primary-fixed border-t-transparent animate-spin" />
            Confirmando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xl">check_circle</span>
            Já realizei o pagamento
          </>
        )}
      </button>
    </div>
  )
}

// ─── Card panel ───────────────────────────────────────────────────────────────

function CardPanel({
  onSubmit,
  loading,
}: {
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
      <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 space-y-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

        {/* Número */}
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
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
              credit_card
            </span>
          </div>
          {errors.number && <FieldError message={errors.number} />}
          <p className="mt-1.5 font-body text-[11px] text-on-surface-variant/60">
            Cartões de teste: <span className="font-mono text-primary/70">4111 1111 1111 1111</span>{' '}
            (aprovado) · <span className="font-mono text-error/70">4222 2222 2222 2222</span>{' '}
            (recusado)
          </p>
        </div>

        {/* Titular */}
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

        {/* Validade + CVV */}
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
            <div className="relative">
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
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
                help
              </span>
            </div>
            {errors.cvv && <FieldError message={errors.cvv} />}
          </div>
        </div>
      </div>

      {/* Segurança */}
      <div className="flex items-center gap-2 px-1">
        <span className="material-symbols-outlined text-on-surface-variant text-base">lock</span>
        <p className="font-body text-xs text-on-surface-variant">
          Dados criptografados · Cartão nunca trafega pelo servidor
        </p>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={handleSubmit}
        className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-base py-4 rounded-lg uppercase tracking-wide shadow-[0_10px_30px_rgba(244,255,198,0.15)] hover:shadow-[0_10px_40px_rgba(244,255,198,0.25)] hover:brightness-105 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-on-primary-fixed border-t-transparent animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xl">lock</span>
            Pagar {centsToReal(MOCK_SESSION.amount)}
          </>
        )}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const params = useParams<{ sessionId?: string }>()
  const { data: coach } = useCoachMe()
  const createPaymentMutation = useCreatePayment()

  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [cardStatus, setCardStatus] = useState<CardStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const isLoading = createPaymentMutation.isPending

  function handleCardSubmit(card: CardForm) {
    setError(null)
    setCardStatus('loading')

    const cardInfo: CardInfo = {
      number: card.number,
      holder: card.holder,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: card.cvv,
    }

    createPaymentMutation.mutate(
      {
        sessionId: params.sessionId ?? MOCK_SESSION.sessionId,
        method: 'credit_card',
        card: cardInfo,
        amount: MOCK_SESSION.amount,
        coachId: coach?.email ?? 'coach_mock',
        studentId: coach?.email ?? 'student_mock',
      },
      {
        onSuccess: (result) => {
          setCardStatus(result.status)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Erro ao processar pagamento')
          setCardStatus('idle')
        },
      },
    )
  }

  function handlePixConfirm() {
    setError(null)
    setCardStatus('loading')

    createPaymentMutation.mutate(
      {
        sessionId: params.sessionId ?? MOCK_SESSION.sessionId,
        method: 'pix',
        amount: MOCK_SESSION.amount,
        coachId: coach?.email ?? 'coach_mock',
        studentId: coach?.email ?? 'student_mock',
      },
      {
        onSuccess: (result) => {
          setCardStatus(result.status)
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : 'Erro ao processar PIX')
          setCardStatus('idle')
        },
      },
    )
  }

  function handleRetry() {
    setCardStatus('idle')
    setError(null)
  }

  const showResult =
    cardStatus === 'approved' || cardStatus === 'refused' || cardStatus === 'pending'

  return (
    <div className="min-h-dvh flex flex-col bg-surface text-on-surface">
      <ProgressHeader currentStep={3} totalSteps={4} />

      <main className="kinetic-grid flex-1 px-4 md:px-8 py-8 max-w-2xl mx-auto w-full space-y-10">
        <div>
          <span className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-primary">
            CoachMatch · Pagamento
          </span>
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mt-2 mb-1">
            Confirme sua sessão
          </h1>
          <p className="font-body text-on-surface-variant text-sm">
            Pagamento seguro e criptografado.
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-4 flex gap-3">
            <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">error</span>
            <p className="font-body text-sm text-error">{error}</p>
          </div>
        )}

        {showResult ? (
          <PaymentResult status={cardStatus} amount={MOCK_SESSION.amount} onRetry={handleRetry} />
        ) : (
          <>
            <Section title="Resumo">
              <div className="bg-surface-container-low rounded-xl border border-outline-variant/20 overflow-hidden">
                <div className="p-5 flex items-center gap-4 border-b border-outline-variant/10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-primary text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-base font-semibold text-on-surface">
                      {MOCK_SESSION.coachName}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {MOCK_SESSION.specialty}
                    </p>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-2 gap-4">
                  {[
                    { icon: 'calendar_today', label: 'Data & Hora', value: MOCK_SESSION.date },
                    { icon: 'timer', label: 'Duração', value: MOCK_SESSION.duration },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-lg mt-0.5">
                        {item.icon}
                      </span>
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {item.label}
                        </p>
                        <p className="font-body text-sm text-on-surface font-medium">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 pb-5 space-y-2 border-t border-outline-variant/10 pt-4">
                  <div className="flex justify-between font-body text-sm text-on-surface-variant">
                    <span>Sessão</span>
                    <span>{centsToReal(MOCK_SESSION.amount)}</span>
                  </div>
                  <div className="flex justify-between font-body text-sm text-on-surface-variant">
                    <span>Taxa plataforma (10%)</span>
                    <span>{centsToReal(MOCK_SESSION.platformFee)}</span>
                  </div>
                  <div className="flex justify-between font-headline text-base font-bold text-on-surface pt-2 border-t border-outline-variant/10">
                    <span>Total</span>
                    <span className="text-primary">{centsToReal(MOCK_SESSION.amount)}</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Método de Pagamento">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: 'pix' as const,
                    icon: 'qr_code_2',
                    label: 'PIX',
                    badge: 'Instantâneo' as string | null,
                  },
                  { id: 'credit_card' as const, icon: 'credit_card', label: 'Cartão', badge: null },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMethod(opt.id)
                    }}
                    className={[
                      'rounded-xl p-4 border text-left transition-all',
                      method === opt.id
                        ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(244,255,198,0.3)]'
                        : 'border-outline-variant/20 bg-surface-container-low hover:border-outline-variant/50',
                    ].join(' ')}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${method === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      {opt.icon}
                    </span>
                    <p
                      className={`font-headline text-sm font-semibold mt-2 ${method === opt.id ? 'text-on-surface' : 'text-on-surface-variant'}`}
                    >
                      {opt.label}
                    </p>
                    {opt.badge !== null && (
                      <span className="inline-block mt-1 font-label text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {opt.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Section>

            <Section title={method === 'pix' ? 'Pague com PIX' : 'Dados do Cartão'}>
              {method === 'pix' ? (
                <PixPanel
                  amount={MOCK_SESSION.amount}
                  onConfirm={handlePixConfirm}
                  loading={isLoading}
                />
              ) : (
                <CardPanel onSubmit={handleCardSubmit} loading={isLoading} />
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  )
}
