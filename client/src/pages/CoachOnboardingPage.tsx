import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { GymPicker } from '@/components/onboarding/GymPicker'
import { getAuthUser } from '@/lib/auth'
import { useSpecialties } from '@/hooks/useSpecialties'
import { useUpdateCoachMe } from '@/hooks/useCoachMe'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import { buildCoachUpdatePayload, useOnboardingStore } from '@/stores/onboardingStore'
import type { Specialty } from '@/types/api'

const HERO_MOBILE = '/assets/images/onboarding-hero-mobile.png'
const HERO_DESKTOP = '/assets/images/onboarding-hero-desktop.png'

const FALLBACK_SPECIALTIES: Specialty[] = [
  { id: 'HYPERTROPHY', label: 'Hipertrofia' },
  { id: 'CROSSFIT', label: 'CrossFit' },
  { id: 'WEIGHT_LOSS', label: 'Emagrecimento' },
  { id: 'STRENGTH', label: 'Força' },
  { id: 'REHAB', label: 'Reabilitação' },
  { id: 'MOBILITY', label: 'Mobilidade' },
  { id: 'BIOMECHANICS', label: 'Biomecânica Aplicada' },
  { id: 'FUNCTIONAL', label: 'Funcional' },
]

export default function CoachOnboardingPage() {
  const navigate = useNavigate()
  const authUser = getAuthUser()
  const updateCoach = useUpdateCoachMe()
  const videoUpload = useVideoUpload()
  const form = useOnboardingStore((state) => state.form)
  const errors = useOnboardingStore((state) => state.errors)
  const specialtySearch = useOnboardingStore((state) => state.specialtySearch)
  const setSpecialtySearch = useOnboardingStore((state) => state.setSpecialtySearch)
  const updateName = useOnboardingStore((state) => state.updateName)
  const updatePhone = useOnboardingStore((state) => state.updatePhone)
  const updateInstagram = useOnboardingStore((state) => state.updateInstagram)
  const updateCref = useOnboardingStore((state) => state.updateCref)
  const toggleSpecialty = useOnboardingStore((state) => state.toggleSpecialty)
  const addGym = useOnboardingStore((state) => state.addGym)
  const removeGym = useOnboardingStore((state) => state.removeGym)
  const setVideoKey = useOnboardingStore((state) => state.setVideoKey)
  const validate = useOnboardingStore((state) => state.validate)
  const resetOnboarding = useOnboardingStore((state) => state.reset)
  const { data: specialtiesData } = useSpecialties(specialtySearch)

  const specialtyOptions = specialtiesData?.data ?? FALLBACK_SPECIALTIES

  const videoInputRef = useRef<HTMLInputElement>(null)
  const [videoFileName, setVideoFileName] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isSubmitting = updateCoach.isPending
  const hasValidationErrors = Object.values(errors).some(Boolean)

  const handleVideoFile = (file: File) => {
    setVideoFileName(file.name)
    setSubmitError(null)
    videoUpload.mutate(file, {
      onSuccess: (key) => {
        setVideoKey(key)
      },
      onError: () => {
        setVideoFileName(null)
      },
    })
  }

  const submit = () => {
    setSubmitError(null)
    if (!validate()) return

    const payload = buildCoachUpdatePayload(form)

    updateCoach.mutate(payload, {
      onSuccess: () => {
        resetOnboarding()
        void navigate('/coach', { replace: true })
      },
      onError: () => {
        setSubmitError('Não foi possível salvar seu perfil. Revise os dados e tente novamente.')
      },
    })
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-surface text-on-surface">
      <aside className="hidden lg:flex lg:w-[40%] xl:w-[35%] lg:h-dvh lg:sticky lg:top-0 relative flex-col justify-end overflow-hidden">
        <img
          alt=""
          src={HERO_DESKTOP}
          className="absolute inset-0 w-full h-full object-cover grayscale-20 contrast-125 mix-blend-luminosity opacity-80"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface-container-lowest via-surface/80 to-transparent" />
        <div className="relative z-10 p-12 xl:p-16 mb-8">
          <span className="inline-block bg-primary text-on-primary-fixed px-3 py-1 font-label text-xs font-bold uppercase tracking-widest rounded-sm mb-6">
            Partner Program
          </span>
          <h1 className="font-headline text-5xl xl:text-6xl font-bold tracking-tighter text-on-surface leading-tight mb-4">
            Entre
            <br />
            para a<br />
            <span className="text-primary">Elite.</span>
          </h1>
          <p className="font-body text-base text-on-surface-variant max-w-sm">
            Apresente seu arsenal técnico. Construa sua autoridade. Domine seu território.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden relative w-full h-65 flex items-end p-6 bg-surface-container-lowest overflow-hidden">
          <img
            alt=""
            src={HERO_MOBILE}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-t from-surface to-transparent" />
          <div className="relative z-10 w-full">
            <span className="text-primary font-headline text-xs font-bold tracking-[0.2em] uppercase block mb-3">
              CoachMatch · Personal Pro
            </span>
            <h1 className="font-headline text-4xl font-bold leading-tight text-on-surface">
              Ative sua
              <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary-dim">
                Potência.
              </span>
            </h1>
            <p className="font-body text-on-surface-variant mt-3 text-sm max-w-[80%]">
              Complete seu perfil para começar a receber alunos.
            </p>
          </div>
        </header>

        <main className="kinetic-grid flex-1 px-4 md:px-8 py-8 max-w-3xl mx-auto w-full space-y-12">
          <div className="hidden lg:block">
            <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Configure seu Arsenal
            </h2>
            <p className="font-body text-on-surface-variant">
              Complete seu perfil de treinador para ser descoberto pelos alunos.
            </p>
          </div>

          <Section title="Identidade">
            <div className="bg-surface-container-low p-6 rounded-xl shadow-lg relative overflow-hidden space-y-5">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Nome Completo"
                  type="text"
                  placeholder="Seu nome completo"
                  value={form.name}
                  error={errors.name}
                  onChange={(e) => {
                    updateName(e.target.value)
                  }}
                />
                <Input
                  label="E-mail do treinador"
                  type="email"
                  value={authUser.email ?? 'E-mail não informado'}
                  disabled
                />
                <Input
                  label="WhatsApp / Telefone"
                  type="tel"
                  icon="phone_iphone"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(e) => {
                    updatePhone(e.target.value)
                  }}
                />
                <Input
                  label="Instagram"
                  type="text"
                  prefix="@"
                  placeholder="seu.perfil"
                  value={form.instagram}
                  error={errors.instagram}
                  onChange={(e) => {
                    updateInstagram(e.target.value)
                  }}
                />
              </div>
            </div>
          </Section>

          <Section title="Autoridade">
            <div className="space-y-6">
              <div className="bg-surface-container-low p-6 rounded-xl">
                <p className="text-xs text-on-surface-variant font-body mb-4">
                  Sua credencial é fundamental para manter o padrão de excelência.
                </p>
                <Input
                  label="Registro CREF *"
                  type="text"
                  icon="badge"
                  placeholder="000000-G/SP"
                  value={form.cref}
                  error={errors.cref}
                  onChange={(e) => {
                    updateCref(e.target.value)
                  }}
                  className="uppercase"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VideoUploadCard
                  fileName={videoFileName}
                  uploaded={!!form.videoKey}
                  uploading={videoUpload.isPending}
                  progress={videoUpload.progress}
                  error={
                    videoUpload.isError ? 'Falha no upload. Tente outro arquivo.' : errors.videoKey
                  }
                  onPick={() => videoInputRef.current?.click()}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleVideoFile(file)
                    e.target.value = ''
                  }}
                />
                <UploadCard
                  icon="photo_camera"
                  title="Foto de Perfil"
                  description="JPG ou PNG, até 5MB."
                />
              </div>
            </div>
          </Section>

          <Section title="Domínio">
            <div className="bg-surface-container-low p-6 rounded-xl space-y-5">
              <p className="text-sm text-on-surface-variant font-body">
                Selecione suas principais áreas de atuação.
              </p>
              <div className="bg-surface-container-highest rounded-full px-4 py-3 flex items-center border border-outline-variant/15 focus-within:border-primary/50 transition-colors">
                <Icon name="search" className="mr-3 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Buscar especialidade..."
                  value={specialtySearch}
                  onChange={(e) => {
                    setSpecialtySearch(e.target.value)
                  }}
                  className="bg-transparent border-none w-full text-on-surface font-body text-sm focus:ring-0 focus:outline-none p-0 placeholder-on-surface-variant/50"
                />
              </div>
              <div className="flex flex-wrap gap-3">
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
                <p className="font-body text-xs text-error">{errors.specialties}</p>
              ) : null}
            </div>
          </Section>

          <Section title="Território">
            <p className="font-body text-sm text-on-surface-variant -mt-2">
              Selecione pelo menos uma academia parceira.
            </p>

            <div className="bg-surface-container-low p-5 rounded-xl space-y-4">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                Academias Parceiras *
              </h3>
              <p className="font-body text-xs text-on-surface-variant">
                Atendo em academias específicas na minha região.
              </p>
              <div className="ml-0">
                <GymPicker
                  selectedGyms={form.gyms}
                  onAdd={addGym}
                  onRemove={removeGym}
                  error={errors.gyms}
                />
              </div>
            </div>
          </Section>

          <div className="pt-4 pb-12">
            <Button
              type="button"
              loading={isSubmitting}
              disabled={videoUpload.isPending}
              onClick={submit}
              className="w-full text-lg"
              icon="arrow_forward"
            >
              {isSubmitting ? 'ENVIANDO...' : 'CONCLUIR PERFIL'}
            </Button>
            {hasValidationErrors ? (
              <p className="mt-4 text-center font-body text-xs text-error">
                Existem erros no formulário. Revise os campos destacados acima.
              </p>
            ) : null}
            {submitError ? (
              <p className="mt-4 text-center font-body text-xs text-error">{submitError}</p>
            ) : null}
            <p className="text-center font-body text-xs text-on-surface-variant mt-4">
              Ao continuar, você aceita os Termos de Curadoria do CoachMatch.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <h2 className="font-headline text-2xl font-semibold text-on-surface border-l-4 border-primary pl-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

interface VideoUploadCardProps {
  fileName: string | null
  uploaded: boolean
  uploading: boolean
  progress: number
  error?: string | undefined
  onPick: () => void
}

function VideoUploadCard({
  fileName,
  uploaded,
  uploading,
  progress,
  error,
  onPick,
}: VideoUploadCardProps) {
  const status = uploading
    ? `Enviando... ${String(progress)}%`
    : uploaded
      ? `Pronto: ${fileName ?? 'vídeo enviado'}`
      : 'Faça upload de um vídeo curto (até 60s) mostrando sua energia.'

  const icon = uploaded ? 'check_circle' : uploading ? 'progress_activity' : 'videocam'

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="bg-surface-container-low rounded-xl p-5 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center hover:bg-surface-container-highest transition-colors cursor-pointer group min-h-40 disabled:cursor-wait "
      >
        <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <Icon name={icon} className={`text-primary ${uploading ? 'animate-spin' : ''}`} />
        </div>
        <h3 className="font-headline text-sm font-semibold text-on-surface mb-1">
          Vídeo de Apresentação
        </h3>
        <p className="font-body text-xs text-on-surface-variant max-w-50">{status}</p>
      </button>
      {error ? <p className="mt-2 font-body text-xs text-error">{error}</p> : null}
    </div>
  )
}

function UploadCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      className="bg-surface-container-low rounded-xl p-5 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center hover:bg-surface-container-highest transition-colors cursor-pointer group min-h-40"
    >
      <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <Icon name={icon} className="text-primary" />
      </div>
      <h3 className="font-headline text-sm font-semibold text-on-surface mb-1">{title}</h3>
      <p className="font-body text-xs text-on-surface-variant max-w-50">{description}</p>
    </button>
  )
}
