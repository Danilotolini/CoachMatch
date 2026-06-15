import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ProgressHeader } from '@/components/layout/ProgressHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { fetchAddressByCep } from '@/api/viacep'
import { useSubmitClientProfile } from '@/hooks/useClientMe'
import { getAuthUser } from '@/lib/auth'
import { getTodayBrazilYMD } from '@/lib/dateTime'

type Gender = 'F' | 'M' | 'NB' | 'NA'
type Goal = 'WEIGHT_LOSS' | 'HYPERTROPHY' | 'CONDITIONING' | 'REHAB' | 'PERFORMANCE'
type Radius = 5 | 10 | 20

interface FormState {
  photoDataUrl: string | null
  name: string
  phone: string
  birthDate: string
  gender: Gender | null
  cep: string
  city: string
  state: string
  radius: Radius
  goal: Goal | null
}

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'F', label: 'Mulher' },
  { id: 'M', label: 'Homem' },
  { id: 'NB', label: 'Não-binário' },
  { id: 'NA', label: 'Prefiro não dizer' },
]

const GOALS: { id: Goal; label: string; description: string }[] = [
  { id: 'WEIGHT_LOSS', label: 'Emagrecimento', description: 'Perder gordura e definir.' },
  { id: 'HYPERTROPHY', label: 'Hipertrofia', description: 'Ganhar massa muscular.' },
  {
    id: 'CONDITIONING',
    label: 'Condicionamento',
    description: 'Mais energia e disposição no dia a dia.',
  },
  { id: 'REHAB', label: 'Reabilitação', description: 'Voltar dos treinos depois de uma lesão.' },
  { id: 'PERFORMANCE', label: 'Performance', description: 'Treinar para um esporte ou prova.' },
]

const RADII: Radius[] = [5, 10, 20]
const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidBirthDate(value: string, maxDate: string): boolean {
  if (!DATE_INPUT_RE.test(value)) return false
  return value <= maxDate
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function formatCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export default function ClientOnboardingPage() {
  const navigate = useNavigate()
  const authUser = getAuthUser()
  const submitProfile = useSubmitClientProfile()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const maxBirthDate = useMemo(() => getTodayBrazilYMD(), [])

  const [form, setForm] = useState<FormState>({
    photoDataUrl: null,
    name: authUser.name ?? '',
    phone: '',
    birthDate: '',
    gender: null,
    cep: '',
    city: '',
    state: '',
    radius: 10,
    goal: null,
  })
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [submitted, setSubmitted] = useState(false)

  interface FormErrors {
    name?: string
    phone?: string
    birthDate?: string
    gender?: string
    cep?: string
    goal?: string
  }
  const errors = useMemo<FormErrors>(() => {
    if (!submitted) return {}
    const e: FormErrors = {}
    if (form.name.trim().length < 2) e.name = 'Informe seu nome completo.'
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Telefone incompleto.'
    if (!form.birthDate) e.birthDate = 'Informe sua data de nascimento.'
    else if (!isValidBirthDate(form.birthDate, maxBirthDate)) {
      e.birthDate = 'Informe uma data de nascimento válida.'
    }
    if (!form.gender) e.gender = 'Selecione uma opção.'
    if (!form.city || !form.state) e.cep = 'Informe um CEP válido.'
    if (!form.goal) e.goal = 'Escolha um objetivo principal.'
    return e
  }, [submitted, form, maxBirthDate])

  const handlePhoto = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        photoDataUrl: typeof reader.result === 'string' ? reader.result : null,
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleCepChange = async (raw: string) => {
    const cep = formatCep(raw)
    setForm((f) => ({ ...f, cep, city: '', state: '' }))
    if (cep.replace(/\D/g, '').length !== 8) {
      setCepStatus('idle')
      return
    }
    setCepStatus('loading')
    try {
      const addr = await fetchAddressByCep(cep)
      if (!addr) {
        setCepStatus('error')
        return
      }
      setForm((f) => ({ ...f, city: addr.localidade, state: addr.uf }))
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  const submit = () => {
    setSubmitted(true)
    const hasErrors =
      form.name.trim().length < 2 ||
      form.phone.replace(/\D/g, '').length < 10 ||
      !form.birthDate ||
      !isValidBirthDate(form.birthDate, maxBirthDate) ||
      !form.gender ||
      !form.city ||
      !form.state ||
      !form.goal
    if (hasErrors) return
    if (!form.gender || !form.goal) return
    submitProfile.mutate(
      {
        name: form.name.trim(),
        phone: form.phone,
        birthDate: form.birthDate,
        gender: form.gender,
        cep: form.cep,
        city: form.city,
        state: form.state,
        radius: form.radius,
        goal: form.goal,
      },
      {
        onSuccess: () => {
          void navigate('/client/health')
        },
      },
    )
  }

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <ProgressHeader
        currentStep={1}
        totalSteps={2}
        title="CoachMatch · Aluno"
        contentClassName="max-w-6xl"
      />

      <main className="px-4 md:px-8 py-8 lg:py-12 max-w-6xl mx-auto w-full pb-44 lg:pb-40 lg:grid lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-12 xl:gap-16 lg:items-start">
        <header className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <span className="font-headline text-xs font-bold text-primary uppercase tracking-[0.2em]">
            Vamos começar
          </span>
          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight lg:leading-tight">
            Conte um pouco
            <br />
            sobre <span className="text-primary">você</span>.
          </h1>
          <p className="font-body text-sm lg:text-base text-on-surface-variant lg:max-w-xs">
            Esses dados ajudam a achar personals próximos e alinhados ao seu objetivo.
          </p>
        </header>

        <div className="mt-10 lg:mt-0 space-y-10">
          <Section title="Identidade">
            <div className="bg-surface-container-low rounded-xl p-6 lg:p-8 space-y-6">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-surface-container-highest border border-dashed border-outline-variant/30 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors active:scale-95"
                >
                  {form.photoDataUrl ? (
                    <img src={form.photoDataUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="add_a_photo" className="text-on-surface-variant" />
                  )}
                </button>
                <div className="flex-1">
                  <h3 className="font-headline text-sm font-semibold">Foto de perfil</h3>
                  <p className="font-body text-xs text-on-surface-variant">
                    Opcional. JPG ou PNG, até 5MB.
                  </p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhoto(file)
                    e.target.value = ''
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Nome completo"
                  type="text"
                  icon="person"
                  placeholder="Seu nome completo"
                  value={form.name}
                  error={errors.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }}
                />
                <Input
                  label="Celular"
                  type="tel"
                  icon="phone_iphone"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))
                  }}
                />
                <Input
                  label="Data de nascimento"
                  type="date"
                  icon="cake"
                  max={maxBirthDate}
                  value={form.birthDate}
                  error={errors.birthDate}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^\d{5,}-/.test(value)) return
                    setForm((f) => ({ ...f, birthDate: value }))
                  }}
                />
              </div>

              <div>
                <label className="block font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                  Gênero
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <Chip
                      key={g.id}
                      label={g.label}
                      active={form.gender === g.id}
                      onClick={() => {
                        setForm((f) => ({ ...f, gender: g.id }))
                      }}
                    />
                  ))}
                </div>
                {errors.gender ? (
                  <p className="font-body text-xs text-error mt-2">{errors.gender}</p>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Localização">
            <div className="bg-surface-container-low rounded-xl p-6 lg:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(160px,0.8fr)_minmax(220px,1.4fr)_minmax(120px,0.6fr)] gap-5">
                <Input
                  label="CEP"
                  type="text"
                  inputMode="numeric"
                  icon="pin_drop"
                  placeholder="00000-000"
                  value={form.cep}
                  error={errors.cep}
                  helpText={
                    cepStatus === 'loading'
                      ? 'Buscando endereço...'
                      : cepStatus === 'error'
                        ? 'Não encontramos esse CEP.'
                        : undefined
                  }
                  onChange={(e) => {
                    void handleCepChange(e.target.value)
                  }}
                />
                <Input label="Cidade" type="text" value={form.city} disabled />
                <Input label="Estado" type="text" value={form.state} disabled />
              </div>

              <div>
                <label className="block font-label text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                  Raio de busca
                </label>
                <div className="flex flex-wrap gap-2">
                  {RADII.map((r) => (
                    <Chip
                      key={r}
                      label={`${String(r)} km`}
                      active={form.radius === r}
                      onClick={() => {
                        setForm((f) => ({ ...f, radius: r }))
                      }}
                    />
                  ))}
                </div>
                <p className="font-body text-xs text-on-surface-variant mt-2">
                  Personals dentro desse raio aparecem na sua busca.
                </p>
              </div>
            </div>
          </Section>

          <Section title="Objetivo principal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GOALS.map((g) => {
                const active = form.goal === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, goal: g.id }))
                    }}
                    className={`w-full min-h-28 text-left flex items-start p-5 rounded-xl border transition-all active:scale-[0.99] ${
                      active
                        ? 'bg-primary/5 border-primary'
                        : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
                    }`}
                  >
                    <Icon
                      name={active ? 'radio_button_checked' : 'radio_button_unchecked'}
                      className={`mr-4 mt-0.5 ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                    />
                    <span>
                      <span
                        className={`block font-headline text-base font-semibold ${active ? 'text-primary' : 'text-on-surface'}`}
                      >
                        {g.label}
                      </span>
                      <span className="block font-body text-xs text-on-surface-variant mt-0.5">
                        {g.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.goal ? (
              <p className="font-body text-xs text-error mt-3">{errors.goal}</p>
            ) : null}
          </Section>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 glass-header pb-safe">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-end">
          <Button
            type="button"
            onClick={submit}
            className="w-full lg:w-auto lg:min-w-64"
            icon="arrow_forward"
          >
            CONTINUAR
          </Button>
        </div>
      </div>
    </div>
  )
}

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
