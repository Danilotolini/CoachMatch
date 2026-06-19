import { useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { logout } from '@/lib/cognito'
import { maskPhone } from '@/lib/formatters'
import { parseApiErrors } from '@/lib/http'
import { getTodayBrazilYMD } from '@/lib/dateTime'
import { fetchAddressByCep } from '@/api/viacep'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { PhotoUploadCard } from '@/components/coach/PhotoUploadCard'
import { ClientBottomNav, ClientSideNav } from '@/components/layout/ClientNavigation'
import {
  ProfileHero,
  ProfileLogoutButton,
  ProfileSection,
} from '@/components/profile/ProfileBlocks'
import { useClientMe, useSubmitClientProfile } from '@/hooks/useClientMe'
import { usePhotoUpload } from '@/hooks/useMediaUpload'
import { usePhotoCrop } from '@/hooks/usePhotoCrop'
import type { Client, ClientGender, ClientGoal } from '@/types/api'

type Radius = 5 | 10 | 20

interface ClientProfileFormState {
  name: string
  phone: string
  birthDate: string
  gender: ClientGender | null
  cep: string
  city: string
  state: string
  radius: Radius
  goal: ClientGoal | null
}

type ClientProfileFormErrors = Partial<
  Record<'name' | 'phone' | 'birthDate' | 'gender' | 'cep' | 'goal', string>
>

const GENDERS: { id: ClientGender; label: string }[] = [
  { id: 'F', label: 'Mulher' },
  { id: 'M', label: 'Homem' },
  { id: 'NB', label: 'Não-binário' },
  { id: 'NA', label: 'Prefiro não dizer' },
]

const GOALS: { id: ClientGoal; label: string; description: string }[] = [
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

function initialsFromName(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'CM'
  )
}

function formatCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function toRadius(value: number | null): Radius {
  return RADII.includes(value as Radius) ? (value as Radius) : 10
}

// A API devolve a data como ISO completo (ex.: "1998-06-28T00:00:00.000Z"), mas o
// <input type="date"> só aceita "YYYY-MM-DD". Fatiar a parte da data (em vez de
// converter com fuso) evita deslocar o dia, já que a data é guardada à meia-noite UTC.
function toBirthDateInput(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? ''
}

function clientToForm(client: Client): ClientProfileFormState {
  return {
    name: client.name ?? '',
    phone: maskPhone(client.phone ?? ''),
    birthDate: toBirthDateInput(client.birthDate),
    gender: client.gender,
    cep: formatCep(client.cep ?? ''),
    city: client.city ?? '',
    state: client.state ?? '',
    radius: toRadius(client.radius),
    goal: client.goal,
  }
}

function isValidBirthDate(value: string, maxDate: string): boolean {
  if (!DATE_INPUT_RE.test(value)) return false
  return value <= maxDate
}

function validateForm(form: ClientProfileFormState, maxBirthDate: string): ClientProfileFormErrors {
  const errors: ClientProfileFormErrors = {}
  if (form.name.trim().length < 2) errors.name = 'Informe seu nome completo.'
  if (form.phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone incompleto.'
  if (!form.birthDate) errors.birthDate = 'Informe sua data de nascimento.'
  else if (!isValidBirthDate(form.birthDate, maxBirthDate)) {
    errors.birthDate = 'Informe uma data de nascimento válida.'
  }
  if (!form.gender) errors.gender = 'Selecione uma opção.'
  if (!form.city || !form.state) errors.cep = 'Informe um CEP válido.'
  if (!form.goal) errors.goal = 'Escolha um objetivo principal.'
  return errors
}

function statusLabel(status: Client['status']): string {
  if (status === 'ACTIVE') return 'Cadastro ativo'
  if (status === 'ONBOARDING_HEALTH') return 'Questionário pendente'
  return 'Perfil pendente'
}

export default function ClientProfilePage() {
  const clientQuery = useClientMe()
  const client = clientQuery.data

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <ClientSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Aluno
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Perfil</h1>
          </div>
          <ProfileLogoutButton
            onClick={() => {
              logout('client', '/')
            }}
          />
        </header>

        <div className="flex flex-1 flex-col gap-5 px-6 pb-8 md:px-12 lg:px-10">
          {clientQuery.isLoading ? (
            <InlineState icon="hourglass_top" text="Carregando seu perfil..." />
          ) : null}

          {clientQuery.isError ? (
            <InlineState
              icon="error"
              text={parseApiErrors(clientQuery.error, 'Não foi possível carregar seu perfil.')}
            />
          ) : null}

          {client ? <ClientProfileEditor client={client} /> : null}
        </div>
      </div>

      <ClientBottomNav />
    </main>
  )
}

function ClientProfileEditor({ client }: { client: Client }) {
  const [form, setForm] = useState<ClientProfileFormState>(() => clientToForm(client))
  const [errors, setErrors] = useState<ClientProfileFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  // `undefined` = foto inalterada (o GET devolve URL assinada, não a key); string = nova key.
  const [photoKey, setPhotoKey] = useState<string | undefined>(undefined)
  const [photoPreview, setPhotoPreview] = useState<string | null>(client.photo_url)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const maxBirthDate = useMemo(() => getTodayBrazilYMD(), [])
  const submitProfile = useSubmitClientProfile()
  const photoUpload = usePhotoUpload('client')

  const displayName = form.name.trim() || 'Aluno CoachMatch'
  const goalLabel = GOALS.find((goal) => goal.id === form.goal)?.label
  const meta = [
    form.city && form.state ? `${form.city}, ${form.state}` : null,
    goalLabel,
    `Raio ${String(form.radius)} km`,
  ].filter((item): item is string => !!item)

  const resetFeedback = () => {
    setSubmitError(null)
    setSuccessMessage(null)
  }

  const updateField = <K extends keyof ClientProfileFormState>(
    key: K,
    value: ClientProfileFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      return Object.fromEntries(Object.entries(current).filter(([errorKey]) => errorKey !== key))
    })
    resetFeedback()
  }

  const handleCepChange = async (raw: string) => {
    const cep = formatCep(raw)
    setForm((current) => ({ ...current, cep, city: '', state: '' }))
    setErrors((current) => {
      return Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'cep'))
    })
    resetFeedback()
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
      setForm((current) => ({ ...current, city: addr.localidade, state: addr.uf }))
      setCepStatus('idle')
    } catch {
      setCepStatus('error')
    }
  }

  const handlePhotoFile = (file: File) => {
    resetFeedback()
    const localUrl = URL.createObjectURL(file)
    photoUpload.mutate(file, {
      onSuccess: (key) => {
        setPhotoKey(key)
        setPhotoPreview(localUrl)
      },
    })
  }

  const photoCrop = usePhotoCrop(handlePhotoFile)

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetFeedback()

    const nextErrors = validateForm(form, maxBirthDate)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!form.gender || !form.goal) return

    try {
      const updated = await submitProfile.mutateAsync({
        name: form.name.trim(),
        phone: form.phone,
        birthDate: form.birthDate,
        gender: form.gender,
        cep: form.cep,
        city: form.city,
        state: form.state,
        radius: form.radius,
        goal: form.goal,
        // Só enviamos a key quando a foto mudou; omitir preserva a atual no back-end.
        ...(photoKey !== undefined ? { photo_key: photoKey } : {}),
      })
      setForm(clientToForm(updated))
      setPhotoPreview(updated.photo_url)
      setPhotoKey(undefined)
      setSuccessMessage('Perfil atualizado.')
    } catch (error) {
      setSubmitError(parseApiErrors(error, 'Não foi possível atualizar seu perfil.'))
    }
  }

  return (
    <>
      <ProfileHero
        eyebrow="Aluno"
        name={displayName}
        email={client.email}
        initials={initialsFromName(displayName)}
        meta={meta}
        statusLabel={statusLabel(client.status)}
        photoUrl={photoPreview}
      />

      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <ProfileSection
              title="Dados pessoais"
              description="Informações usadas para personalizar sua busca por Personal."
              icon="badge"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  label="Nome completo"
                  type="text"
                  icon="person"
                  value={form.name}
                  error={errors.name}
                  onChange={(event) => {
                    updateField('name', event.target.value)
                  }}
                />
                <Input label="E-mail" type="email" value={client.email} disabled />
                <Input
                  label="Celular"
                  type="tel"
                  icon="phone_iphone"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  error={errors.phone}
                  transform={maskPhone}
                  onChange={(event) => {
                    updateField('phone', maskPhone(event.target.value))
                  }}
                />
                <Input
                  label="Data de nascimento"
                  type="date"
                  icon="cake"
                  max={maxBirthDate}
                  value={form.birthDate}
                  error={errors.birthDate}
                  onChange={(event) => {
                    const value = event.target.value
                    if (/^\d{5,}-/.test(value)) return
                    updateField('birthDate', value)
                  }}
                />
              </div>

              <div className="mt-5">
                <label className="mb-3 block font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Gênero
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((gender) => (
                    <Chip
                      key={gender.id}
                      label={gender.label}
                      active={form.gender === gender.id}
                      onClick={() => {
                        updateField('gender', gender.id)
                      }}
                    />
                  ))}
                </div>
                {errors.gender ? (
                  <p className="mt-2 font-body text-xs text-error">{errors.gender}</p>
                ) : null}
              </div>
            </ProfileSection>

            <ProfileSection
              title="Localização"
              description="Define o alcance da sua busca por treinadores próximos."
              icon="location_on"
            >
              <div className="grid gap-5 md:grid-cols-[minmax(160px,0.8fr)_minmax(220px,1.4fr)_minmax(120px,0.6fr)]">
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
                  onChange={(event) => {
                    void handleCepChange(event.target.value)
                  }}
                />
                <Input label="Cidade" type="text" value={form.city} disabled />
                <Input label="Estado" type="text" value={form.state} disabled />
              </div>

              <div className="mt-5">
                <label className="mb-3 block font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Raio de busca
                </label>
                <div className="flex flex-wrap gap-2">
                  {RADII.map((radius) => (
                    <Chip
                      key={radius}
                      label={`${String(radius)} km`}
                      active={form.radius === radius}
                      onClick={() => {
                        updateField('radius', radius)
                      }}
                    />
                  ))}
                </div>
              </div>
            </ProfileSection>

            <ProfileSection
              title="Objetivo principal"
              description="Seu foco atual para encontrar o Treinador certo."
              icon="flag"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {GOALS.map((goal) => {
                  const active = form.goal === goal.id
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        updateField('goal', goal.id)
                      }}
                      className={`flex min-h-28 w-full items-start rounded-xl border p-5 text-left transition-all active:scale-[0.99] ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-surface-container hover:bg-surface-container-high'
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
                          {goal.label}
                        </span>
                        <span className="mt-0.5 block font-body text-xs text-on-surface-variant">
                          {goal.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {errors.goal ? (
                <p className="mt-3 font-body text-xs text-error">{errors.goal}</p>
              ) : null}
            </ProfileSection>
          </div>

          <aside className="flex flex-col gap-5">
            <ProfileSection
              title="Foto de perfil"
              description="Ajuda o treinador a reconhecer você no primeiro contato."
              icon="account_circle"
            >
              <PhotoUploadCard
                label={photoPreview ? 'Trocar foto' : 'Enviar foto'}
                previewUrl={photoPreview}
                uploading={photoUpload.isPending}
                progress={photoUpload.progress}
                error={photoUpload.isError ? 'Falha no upload. Tente outra imagem.' : undefined}
                hint={
                  photoKey !== undefined && !photoUpload.isPending
                    ? 'Salve o perfil para confirmar a foto.'
                    : undefined
                }
                onPick={() => photoInputRef.current?.click()}
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) photoCrop.requestCrop(file)
                  event.target.value = ''
                }}
              />
            </ProfileSection>
          </aside>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/10 bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 font-body text-sm">
            {successMessage ? (
              <span className="inline-flex items-center gap-2 font-semibold text-primary">
                <Icon name="check_circle" size={18} filled />
                {successMessage}
              </span>
            ) : submitError ? (
              <span className="inline-flex items-center gap-2 text-error">
                <Icon name="error" size={18} />
                {submitError}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-on-surface-variant">
                <Icon name="info" size={18} />
                Mantenha seus dados em dia para melhorar a busca.
              </span>
            )}
          </p>
          <Button
            type="submit"
            loading={submitProfile.isPending}
            icon="save"
            className="w-full sm:w-auto"
          >
            SALVAR PERFIL
          </Button>
        </div>
      </form>
      {photoCrop.cropModal}
    </>
  )
}

function InlineState({ icon, text }: { icon: string; text: string }) {
  return (
    <section className="flex min-h-48 items-center justify-center rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 text-center">
      <div>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-primary">
          <Icon name={icon} size={22} />
        </span>
        <p className="mt-3 font-body text-sm font-medium text-on-surface-variant">{text}</p>
      </div>
    </section>
  )
}
