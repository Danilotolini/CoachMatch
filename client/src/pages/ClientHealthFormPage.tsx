import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ProgressHeader } from '@/components/layout/ProgressHeader'

type Answer = 'YES' | 'NO'

interface ParqQuestion {
  id: string
  text: string
}

const PARQ: ParqQuestion[] = [
  {
    id: 'heart',
    text: 'Algum médico já disse que você tem uma condição cardíaca e que só deveria fazer atividade física sob orientação?',
  },
  {
    id: 'chest_pain',
    text: 'Você sente dor no peito ao realizar atividade física?',
  },
  {
    id: 'dizziness',
    text: 'No último mês, você teve tontura ou perdeu o equilíbrio por causa de tontura?',
  },
  {
    id: 'bone_joint',
    text: 'Você tem algum problema ósseo ou articular que pode piorar com mudança na sua atividade física?',
  },
  {
    id: 'medication',
    text: 'Você toma medicação para pressão arterial ou problema cardíaco?',
  },
]

interface FormState {
  answers: Record<string, Answer | null>
  notes: string
  lgpdConsent: boolean
  medicalDisclaimer: boolean
}

const INITIAL_ANSWERS: Record<string, Answer | null> = PARQ.reduce<Record<string, Answer | null>>(
  (acc, q) => ({ ...acc, [q.id]: null }),
  {},
)

export default function ClientHealthFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({
    answers: INITIAL_ANSWERS,
    notes: '',
    lgpdConsent: false,
    medicalDisclaimer: false,
  })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [])

  const errors = useMemo<{ parq?: string; lgpd?: string; disclaimer?: string }>(() => {
    if (!submitted) return {}
    const e: { parq?: string; lgpd?: string; disclaimer?: string } = {}
    if (PARQ.some((q) => form.answers[q.id] == null)) {
      e.parq = 'Responda todas as perguntas.'
    }
    if (!form.lgpdConsent) e.lgpd = 'Necessário para prosseguir.'
    if (!form.medicalDisclaimer) e.disclaimer = 'Necessário para prosseguir.'
    return e
  }, [submitted, form])

  const flagged = useMemo(() => PARQ.some((q) => form.answers[q.id] === 'YES'), [form.answers])

  const submit = () => {
    setSubmitted(true)
    if (
      PARQ.some((q) => form.answers[q.id] == null) ||
      !form.lgpdConsent ||
      !form.medicalDisclaimer
    ) {
      return
    }
    void navigate('/client')
  }

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <ProgressHeader
        currentStep={2}
        totalSteps={2}
        title="CoachMatch · Aluno"
        contentClassName="max-w-6xl"
      />

      <main className="px-4 md:px-8 py-8 lg:py-12 max-w-6xl mx-auto w-full pb-44 lg:pb-40 lg:grid lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-12 xl:gap-16 lg:items-start">
        <header className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <span className="font-headline text-xs font-bold text-primary uppercase tracking-[0.2em]">
            Antes do primeiro match
          </span>
          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight lg:leading-tight">
            Saúde e <span className="text-primary">segurança</span>.
          </h1>
          <p className="font-body text-sm lg:text-base text-on-surface-variant lg:max-w-xs">
            Essas respostas vão para o personal antes da contratação. Sem isso, você consegue
            explorar — mas não contratar.
          </p>
        </header>

        <div className="mt-10 lg:mt-0 space-y-10">
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
              <h2 className="font-headline text-xl font-semibold border-l-4 border-primary pl-3">
                PAR-Q
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                Questionário padrão de prontidão para atividade física.
              </p>
            </div>
            <div className="space-y-3">
              {PARQ.map((q, idx) => {
                const value = form.answers[q.id]
                return (
                  <div
                    key={q.id}
                    className="bg-surface-container-low rounded-xl p-5 lg:p-6 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center lg:gap-6"
                  >
                    <p className="font-body text-sm text-on-surface">
                      <span className="font-headline text-primary mr-2">{String(idx + 1)}.</span>
                      {q.text}
                    </p>
                    <div className="flex gap-2">
                      {(['NO', 'YES'] as Answer[]).map((a) => {
                        const active = value === a
                        const label = a === 'YES' ? 'Sim' : 'Não'
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                answers: { ...f.answers, [q.id]: a },
                              }))
                            }}
                            className={`flex-1 py-3 rounded-lg font-headline text-sm font-bold uppercase tracking-wide transition-all active:scale-95 ${
                              active
                                ? 'bg-primary text-on-primary-fixed'
                                : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {errors.parq ? <p className="font-body text-xs text-error">{errors.parq}</p> : null}
            {flagged ? (
              <div className="bg-surface-container-low border border-primary/30 rounded-xl p-4 flex gap-3">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="font-body text-xs text-on-surface-variant">
                  Como você respondeu sim a uma das perguntas, recomendamos uma avaliação médica
                  antes de começar. Continuar é sua escolha.
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-xl font-semibold border-l-4 border-primary pl-3">
              Observações
            </h2>
            <div className="bg-surface-container-low rounded-xl p-5 lg:p-6 space-y-2">
              <label
                htmlFor="health-notes"
                className="block font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider"
              >
                Restrições, lesões ou cirurgias
              </label>
              <textarea
                id="health-notes"
                rows={5}
                placeholder="Ex.: cirurgia no joelho direito em 2024, hérnia de disco lombar..."
                value={form.notes}
                onChange={(e) => {
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }}
                className="bg-surface-container-highest w-full rounded-lg border border-surface-variant focus:border-primary focus:ring-0 focus:outline-none p-3 font-body text-sm text-on-surface placeholder-on-surface-variant/50 transition-colors resize-none"
              />
              <p className="font-body text-xs text-on-surface-variant">
                Opcional, mas ajuda o personal a montar um plano seguro.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-headline text-xl font-semibold border-l-4 border-primary pl-3">
              Consentimentos
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <ConsentRow
                checked={form.lgpdConsent}
                onChange={() => {
                  setForm((f) => ({ ...f, lgpdConsent: !f.lgpdConsent }))
                }}
                error={errors.lgpd}
              >
                Autorizo o CoachMatch a compartilhar minhas respostas de saúde com o personal que eu
                contratar, conforme a{' '}
                <a
                  href="#"
                  className="text-primary underline decoration-primary/30 underline-offset-2"
                >
                  política de privacidade
                </a>{' '}
                (LGPD).
              </ConsentRow>

              <ConsentRow
                checked={form.medicalDisclaimer}
                onChange={() => {
                  setForm((f) => ({ ...f, medicalDisclaimer: !f.medicalDisclaimer }))
                }}
                error={errors.disclaimer}
              >
                Entendo que o CoachMatch não é serviço médico. Em caso de condição clínica
                relevante, devo procurar orientação médica antes de iniciar treinos.
              </ConsentRow>
            </div>
          </section>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 glass-header pb-safe">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex gap-3 lg:justify-end">
          <button
            type="button"
            onClick={() => {
              void navigate(-1)
            }}
            className="bg-surface-container-high border border-outline-variant/30 text-on-surface font-headline font-bold text-sm uppercase tracking-wide py-4 px-5 rounded-lg transition-all active:scale-95 hover:border-primary/50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-1 lg:flex-none lg:min-w-64 bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-sm uppercase tracking-wide py-4 px-8 rounded-lg shadow-[0_10px_30px_rgba(244,255,198,0.15)] hover:brightness-105 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Concluir
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ConsentRow({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean
  onChange: () => void
  error?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        className={`flex items-start gap-3 p-5 rounded-xl border cursor-pointer transition-all ${
          checked
            ? 'bg-primary/5 border-primary'
            : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
        }`}
      >
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <span
          className={`material-symbols-outlined mt-0.5 ${checked ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          {checked ? 'check_box' : 'check_box_outline_blank'}
        </span>
        <span className="font-body text-sm text-on-surface flex-1">{children}</span>
      </label>
      {error ? <p className="font-body text-xs text-error mt-2">{error}</p> : null}
    </div>
  )
}
