import { useMemo, useState, type SyntheticEvent } from 'react'
import { logout } from '@/lib/cognito'
import { parseApiErrors } from '@/lib/http'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { CoachBottomNav, CoachSideNav } from '@/components/layout/CoachNavigation'
import {
  ProfileHero,
  ProfileInfoGrid,
  ProfileLogoutButton,
  ProfileSection,
} from '@/components/profile/ProfileBlocks'
import { useCoachMe, useUpdateCoachMe } from '@/hooks/useCoachMe'
import { useSpecialties } from '@/hooks/useSpecialties'
import type { Coach, CoachProfile } from '@/types/api'

interface CoachProfileFormState {
  name: string
  phone: string
  cref: string
  instagram: string
  specialties: string[]
}

type CoachProfileFormErrors = Partial<Record<keyof CoachProfileFormState, string>>

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

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function normalizeInstagram(value: string): string {
  return value
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

function normalizeCref(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9A-Z/-]/g, '')
    .slice(0, 11)
}

function profileToForm(profile: CoachProfile): CoachProfileFormState {
  return {
    name: profile.name,
    phone: maskPhone(profile.phone ?? ''),
    cref: profile.cref,
    instagram: normalizeInstagram(profile.instagram),
    specialties: profile.specialties,
  }
}

function validateForm(form: CoachProfileFormState): CoachProfileFormErrors {
  const errors: CoachProfileFormErrors = {}
  const phoneDigits = onlyDigits(form.phone)

  if (!form.name.trim()) {
    errors.name = 'Informe seu nome completo.'
  }

  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.phone = 'Informe um telefone com DDD.'
  }

  if (!/^\d{6}-[GP]\/[A-Z]{2}$/.test(form.cref)) {
    errors.cref = 'Use o formato 000000-G/SP.'
  }

  if (form.instagram && !/^[a-z0-9._]{1,30}$/.test(form.instagram)) {
    errors.instagram = 'Use apenas letras, números, ponto e underline.'
  }

  if (form.specialties.length === 0) {
    errors.specialties = 'Selecione pelo menos uma especialidade.'
  }

  return errors
}

function formatSpecialtyLabel(id: string, labelById: Map<string, string>): string {
  return labelById.get(id) ?? id.replace(/_/g, ' ')
}

function formatWorkLocation(coach: Coach): string {
  const gymCount = coach.work_location.filter((item) => item.type === 'GYM').length
  const homeService = coach.work_location.find((item) => item.type === 'HOME_SERVICE')

  if (homeService && gymCount > 0) {
    return `${String(gymCount)} academia${gymCount === 1 ? '' : 's'} e atendimento externo`
  }

  if (homeService) {
    return `${homeService.coverage.city}, ${homeService.coverage.state}`
  }

  if (gymCount > 0) {
    return `${String(gymCount)} academia${gymCount === 1 ? '' : 's'} parceira${gymCount === 1 ? '' : 's'}`
  }

  return 'Território não definido'
}

function profileStatusLabel(coach: Coach): string {
  if (coach.status === 'APPROVED') return 'Perfil ativo'
  return 'Perfil pendente'
}

export default function CoachProfilePage() {
  const coachQuery = useCoachMe()
  const coach = coachQuery.data

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full bg-surface text-on-surface">
      <CoachSideNav />

      <div className="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
        <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 py-6 md:px-12 lg:relative lg:bg-transparent lg:px-10 lg:py-8 lg:backdrop-blur-none">
          <div>
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              Treinador
            </span>
            <h1 className="font-headline text-2xl font-bold tracking-tight lg:text-3xl">Perfil</h1>
          </div>
          <ProfileLogoutButton
            onClick={() => {
              logout('coach')
            }}
          />
        </header>

        <div className="flex flex-1 flex-col gap-5 px-6 pb-8 md:px-12 lg:px-10">
          {coachQuery.isLoading ? (
            <InlineState icon="hourglass_top" text="Carregando seu perfil..." />
          ) : null}

          {coachQuery.isError ? (
            <InlineState
              icon="error"
              text={parseApiErrors(coachQuery.error, 'Não foi possível carregar seu perfil.')}
            />
          ) : null}

          {coach ? <CoachProfileEditor coach={coach} /> : null}
        </div>
      </div>

      <CoachBottomNav />
    </main>
  )
}

function CoachProfileEditor({ coach }: { coach: Coach }) {
  const [form, setForm] = useState<CoachProfileFormState>(() => profileToForm(coach.profile))
  const [errors, setErrors] = useState<CoachProfileFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const updateCoach = useUpdateCoachMe()
  const { data: specialtiesData } = useSpecialties()

  const labelById = useMemo(
    () =>
      new Map((specialtiesData?.data ?? []).map((specialty) => [specialty.id, specialty.label])),
    [specialtiesData?.data],
  )

  const specialtyOptions = useMemo(() => {
    const fromApi = specialtiesData?.data ?? []
    const missingSelected = form.specialties
      .filter((id) => !fromApi.some((specialty) => specialty.id === id))
      .map((id) => ({ id, label: formatSpecialtyLabel(id, labelById) }))

    return [...fromApi, ...missingSelected]
  }, [form.specialties, labelById, specialtiesData?.data])

  const displayName = form.name.trim() || 'Treinador CoachMatch'
  const primarySpecialty = form.specialties[0]
    ? formatSpecialtyLabel(form.specialties[0], labelById)
    : 'Especialidade em aberto'
  const meta = [form.cref || 'CREF em aberto', primarySpecialty, formatWorkLocation(coach)]

  const updateField = <K extends keyof CoachProfileFormState>(
    key: K,
    value: CoachProfileFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      return Object.fromEntries(Object.entries(current).filter(([errorKey]) => errorKey !== key))
    })
    setSubmitError(null)
    setSuccessMessage(null)
  }

  const toggleSpecialty = (id: string) => {
    updateField(
      'specialties',
      form.specialties.includes(id)
        ? form.specialties.filter((item) => item !== id)
        : [...form.specialties, id],
    )
  }

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      const updatedCoach = await updateCoach.mutateAsync({
        profile: {
          name: form.name.trim(),
          phone: onlyDigits(form.phone),
          cref: form.cref,
          instagram: form.instagram ? `@${form.instagram}` : '',
          specialties: form.specialties,
        },
      })
      setForm(profileToForm(updatedCoach.profile))
      setSuccessMessage('Perfil atualizado.')
    } catch (error) {
      setSubmitError(parseApiErrors(error, 'Não foi possível atualizar seu perfil.'))
    }
  }

  return (
    <>
      <ProfileHero
        eyebrow="Autoridade"
        name={displayName}
        email={coach.email}
        initials={initialsFromName(displayName)}
        meta={meta}
        statusLabel={profileStatusLabel(coach)}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
          className="flex flex-col gap-5"
        >
          <ProfileSection
            title="Dados profissionais"
            description="Informações usadas na sua vitrine para alunos."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Nome completo"
                type="text"
                value={form.name}
                error={errors.name}
                onChange={(event) => {
                  updateField('name', event.target.value)
                }}
              />
              <Input label="E-mail do treinador" type="email" value={coach.email} disabled />
              <Input
                label="WhatsApp / telefone"
                type="tel"
                icon="phone_iphone"
                placeholder="(11) 99999-9999"
                value={form.phone}
                error={errors.phone}
                onChange={(event) => {
                  updateField('phone', maskPhone(event.target.value))
                }}
              />
              <Input
                label="Instagram"
                type="text"
                prefix="@"
                placeholder="seu.perfil"
                value={form.instagram}
                error={errors.instagram}
                onChange={(event) => {
                  updateField('instagram', normalizeInstagram(event.target.value))
                }}
              />
              <Input
                label="Registro CREF"
                type="text"
                icon="badge"
                placeholder="000000-G/SP"
                value={form.cref}
                error={errors.cref}
                onChange={(event) => {
                  updateField('cref', normalizeCref(event.target.value))
                }}
                className="uppercase"
              />
            </div>
          </ProfileSection>

          <ProfileSection
            title="Especialidades"
            description="Selecione os focos técnicos que sustentam seu posicionamento."
          >
            <div className="flex flex-wrap gap-2">
              {specialtyOptions.map((specialty) => {
                const active = form.specialties.includes(specialty.id)
                return (
                  <Chip
                    key={specialty.id}
                    label={specialty.label}
                    active={active}
                    onClick={() => {
                      toggleSpecialty(specialty.id)
                    }}
                    {...(active
                      ? {
                          onRemove: () => {
                            toggleSpecialty(specialty.id)
                          },
                        }
                      : {})}
                  />
                )
              })}
            </div>
            {errors.specialties ? (
              <p className="mt-3 font-body text-xs text-error">{errors.specialties}</p>
            ) : null}
          </ProfileSection>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              loading={updateCoach.isPending}
              icon="save"
              className="w-full sm:w-auto"
            >
              SALVAR PERFIL
            </Button>
            {successMessage ? (
              <p className="font-body text-sm font-semibold text-primary">{successMessage}</p>
            ) : null}
            {submitError ? <p className="font-body text-sm text-error">{submitError}</p> : null}
          </div>
        </form>

        <aside className="flex flex-col gap-5">
          <ProfileSection title="Resumo">
            <ProfileInfoGrid
              items={[
                { label: 'Telefone', value: form.phone || 'Não informado' },
                { label: 'CREF', value: form.cref || 'Não informado' },
                {
                  label: 'Instagram',
                  value: form.instagram ? `@${form.instagram}` : 'Não informado',
                },
                { label: 'Território', value: formatWorkLocation(coach) },
              ]}
            />
          </ProfileSection>

          <section className="rounded-xl border border-outline-variant/10 bg-surface-container p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed">
                <Icon name="workspace_premium" size={20} />
              </span>
              <div>
                <h2 className="font-headline text-base font-bold">Vitrine em edição</h2>
                <p className="mt-1 font-body text-sm text-on-surface-variant">
                  Salvar envia suas alterações para o endpoint seguro do treinador.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
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
