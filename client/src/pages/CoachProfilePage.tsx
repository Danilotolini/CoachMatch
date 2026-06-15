import { useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { maskCref } from '@/lib/cref'
import { logout } from '@/lib/cognito'
import { parseApiErrors } from '@/lib/http'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Input'
import { CoachBottomNav, CoachSideNav } from '@/components/layout/CoachNavigation'
import { GymPicker, type GymOption } from '@/components/onboarding/GymPicker'
import {
  ProfileHero,
  ProfileLogoutButton,
  ProfileSection,
} from '@/components/profile/ProfileBlocks'
import { useCoachMe, useUpdateCoachMe } from '@/hooks/useCoachMe'
import { useGyms } from '@/hooks/useGyms'
import { useSpecialties } from '@/hooks/useSpecialties'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import type { Coach, CoachProfile, Gym, WorkLocation } from '@/types/api'

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

function profileToForm(profile: CoachProfile): CoachProfileFormState {
  return {
    name: profile.name,
    phone: maskPhone(profile.phone ?? ''),
    cref: maskCref(profile.cref),
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

function formatWorkLocation(gymCount: number): string {
  if (gymCount > 0) {
    return `${String(gymCount)} academia${gymCount === 1 ? '' : 's'} parceira${gymCount === 1 ? '' : 's'}`
  }

  return 'Território não definido'
}

function gymToOption(gym: Gym): GymOption {
  return {
    id: gym.gymId,
    name: gym.name,
    city: gym.city,
    state: gym.state,
    neighborhood: gym.neighborhood,
  }
}

function extractGymIds(workLocation: WorkLocation[]): string[] {
  return workLocation.map((item) => item.gymId)
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
  const [hasVideo, setHasVideo] = useState(coach.profile.profile_video)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>(() =>
    extractGymIds(coach.work_location),
  )
  const [sessionGyms, setSessionGyms] = useState<Record<string, GymOption | undefined>>({})
  const [gymError, setGymError] = useState<string | null>(null)
  const updateCoach = useUpdateCoachMe()
  const videoUpload = useVideoUpload()
  const { data: specialtiesData } = useSpecialties()
  const { data: gymsData } = useGyms()

  const gymById = useMemo(
    () => new Map((gymsData?.data ?? []).map((gym) => [gym.gymId, gymToOption(gym)])),
    [gymsData?.data],
  )

  const selectedGyms = useMemo<GymOption[]>(
    () =>
      selectedGymIds.map(
        (id) =>
          gymById.get(id) ??
          sessionGyms[id] ?? { id, name: id, city: '', state: '', neighborhood: '' },
      ),
    [selectedGymIds, gymById, sessionGyms],
  )

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
  const meta = [formatWorkLocation(selectedGymIds.length)]

  const addGym = (gym: Gym) => {
    setGymError(null)
    setSubmitError(null)
    setSuccessMessage(null)
    if (selectedGymIds.includes(gym.gymId)) return
    setSessionGyms((current) => ({ ...current, [gym.gymId]: gymToOption(gym) }))
    setSelectedGymIds((current) => [...current, gym.gymId])
  }

  const removeGym = (gymId: string) => {
    setSubmitError(null)
    setSuccessMessage(null)
    setSelectedGymIds((current) => current.filter((id) => id !== gymId))
  }

  const handleVideoFile = (file: File) => {
    setVideoFileName(file.name)
    setSubmitError(null)
    setSuccessMessage(null)
    videoUpload.mutate(file, {
      onSuccess: () => {
        setHasVideo(true)
      },
      onError: () => {
        setVideoFileName(null)
      },
    })
  }

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
    const nextGymError =
      selectedGymIds.length === 0 ? 'Selecione pelo menos uma academia parceira.' : null
    setGymError(nextGymError)
    if (Object.keys(nextErrors).length > 0 || nextGymError) return

    const workLocation: WorkLocation[] = selectedGymIds.map((gymId) => ({
      type: 'GYM' as const,
      gymId,
    }))

    try {
      const updatedCoach = await updateCoach.mutateAsync({
        profile: {
          name: form.name.trim(),
          phone: onlyDigits(form.phone),
          cref: form.cref,
          instagram: form.instagram ? `@${form.instagram}` : '',
          specialties: form.specialties,
          profile_video: hasVideo,
        },
        work_location: workLocation,
      })
      setForm(profileToForm(updatedCoach.profile))
      setHasVideo(updatedCoach.profile.profile_video)
      setSelectedGymIds(extractGymIds(updatedCoach.work_location))
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

      <form
        onSubmit={(event) => {
          void handleSubmit(event)
        }}
        className="flex flex-col gap-5"
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <ProfileSection
              title="Dados profissionais"
              description="Informações usadas na sua vitrine para alunos."
              icon="badge"
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
                  transform={maskPhone}
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
                  transform={normalizeInstagram}
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
                  transform={maskCref}
                  onChange={(event) => {
                    updateField('cref', maskCref(event.target.value, form.cref))
                  }}
                  className="uppercase"
                />
              </div>
            </ProfileSection>

            <ProfileSection
              title="Especialidades"
              description="Selecione os focos técnicos que sustentam seu posicionamento."
              icon="fitness_center"
              aside={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  <Icon name="check_circle" size={14} filled={form.specialties.length > 0} />
                  {form.specialties.length} selecionada{form.specialties.length === 1 ? '' : 's'}
                </span>
              }
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

            <ProfileSection
              title="Academias"
              description="Academias parceiras onde você atende seus alunos."
              icon="location_on"
              aside={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 font-label text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  <Icon name="check_circle" size={14} filled={selectedGymIds.length > 0} />
                  {selectedGymIds.length} selecionada{selectedGymIds.length === 1 ? '' : 's'}
                </span>
              }
            >
              <GymPicker
                selectedGyms={selectedGyms}
                onAdd={addGym}
                onRemove={removeGym}
                error={gymError ?? undefined}
              />
            </ProfileSection>
          </div>

          <aside className="flex flex-col gap-5">
            <ProfileSection
              title="Vídeo de apresentação"
              description="Um vídeo curto aumenta sua conversão na vitrine."
              icon="videocam"
            >
              <VideoUploadCard
                uploaded={hasVideo}
                uploading={videoUpload.isPending}
                progress={videoUpload.progress}
                fileName={videoFileName}
                error={videoUpload.isError ? 'Falha no upload. Tente outro arquivo.' : undefined}
                onPick={() => videoInputRef.current?.click()}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleVideoFile(file)
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
                Revise seus dados antes de publicar na vitrine.
              </span>
            )}
          </p>
          <Button
            type="submit"
            loading={updateCoach.isPending}
            icon="save"
            className="w-full sm:w-auto"
          >
            SALVAR PERFIL
          </Button>
        </div>
      </form>
    </>
  )
}

interface VideoUploadCardProps {
  uploaded: boolean
  uploading: boolean
  progress: number
  fileName: string | null
  error?: string | undefined
  onPick: () => void
}

function VideoUploadCard({
  uploaded,
  uploading,
  progress,
  fileName,
  error,
  onPick,
}: VideoUploadCardProps) {
  const status = uploading
    ? `Enviando... ${String(progress)}%`
    : uploaded
      ? fileName
        ? `Pronto: ${fileName}`
        : 'Vídeo de apresentação publicado.'
      : 'Faça upload de um vídeo curto (até 60s) mostrando sua energia.'

  const icon = uploaded ? 'check_circle' : uploading ? 'progress_activity' : 'videocam'

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="group flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-5 text-center transition-colors hover:bg-surface-container-highest disabled:cursor-wait"
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest transition-colors group-hover:bg-primary/20">
          <Icon name={icon} className={`text-primary ${uploading ? 'animate-spin' : ''}`} />
        </span>
        <span className="font-headline text-sm font-semibold text-on-surface">
          {uploaded ? 'Trocar vídeo' : 'Enviar vídeo'}
        </span>
        <span className="mt-1 max-w-52 font-body text-xs text-on-surface-variant">{status}</span>
      </button>
      {error ? <p className="font-body text-xs text-error">{error}</p> : null}
      {uploaded && !uploading ? (
        <p className="font-body text-xs text-on-surface-variant">
          Salve o perfil para confirmar a publicação na vitrine.
        </p>
      ) : null}
    </div>
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
