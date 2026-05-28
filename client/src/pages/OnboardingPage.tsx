import { useNavigate } from 'react-router'
import { ProgressHeader } from '@/components/layout/ProgressHeader'
import { Input } from '@/components/ui/Input'
import { Chip } from '@/components/ui/Chip'
import { RadioOption } from '@/components/ui/RadioOption'
import { getAuthUser } from '@/lib/auth'
import { useGyms } from '@/hooks/useGyms'
import { useSpecialties } from '@/hooks/useSpecialties'
import { useUpdateCoachMe } from '@/hooks/useCoachMe'
import { createCoachPayload, useOnboardingStore } from '@/stores/onboardingStore'

const HERO_MOBILE = '/assets/images/onboarding-hero-mobile.png'

const HERO_DESKTOP = '/assets/images/onboarding-hero-desktop.png'

const SPECIALTY_OPTIONS = [
  'Hipertrofia',
  'Crossfit',
  'Emagrecimento',
  'Força',
  'Reabilitação',
  'Mobilidade',
  'Biomecânica Aplicada',
  'Funcional',
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const authUser = getAuthUser()
  const updateCoach = useUpdateCoachMe()
  const form = useOnboardingStore((state) => state.form)
  const errors = useOnboardingStore((state) => state.errors)
  const specialtySearch = useOnboardingStore((state) => state.specialtySearch)
  const gymSearch = useOnboardingStore((state) => state.gymSearch)
  const setSpecialtySearch = useOnboardingStore((state) => state.setSpecialtySearch)
  const setGymSearch = useOnboardingStore((state) => state.setGymSearch)
  const update = useOnboardingStore((state) => state.update)
  const updatePhone = useOnboardingStore((state) => state.updatePhone)
  const updateInstagram = useOnboardingStore((state) => state.updateInstagram)
  const updateCref = useOnboardingStore((state) => state.updateCref)
  const toggleSpecialty = useOnboardingStore((state) => state.toggleSpecialty)
  const selectGym = useOnboardingStore((state) => state.selectGym)
  const clearGym = useOnboardingStore((state) => state.clearGym)
  const setGymError = useOnboardingStore((state) => state.setGymError)
  const validate = useOnboardingStore((state) => state.validate)
  const resetOnboarding = useOnboardingStore((state) => state.reset)
  const { data: specialtiesData } = useSpecialties(specialtySearch)
  const { data: gymsData } = useGyms(gymSearch)

  const specialtyOptions =
    specialtiesData?.data.map((specialty) => specialty.name) ?? SPECIALTY_OPTIONS
  const gymOptions = gymsData?.data ?? []

  const submit = () => {
    if (!validate()) return

    const payload = createCoachPayload(form, authUser.name)

    updateCoach.mutate(payload, {
      onSuccess: (coach) => {
        resetOnboarding()
        const nextRoute = coach.status === 'PENDING_REVIEW' ? '/em-analise' : '/dashboard'
        void navigate(nextRoute, { replace: true })
      },
    })
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-surface text-on-surface">
      <aside className="hidden lg:flex lg:w-[40%] xl:w-[35%] lg:h-dvh lg:sticky lg:top-0 relative flex-col justify-end overflow-hidden">
        <img
          alt=""
          src={HERO_DESKTOP}
          className="absolute inset-0 w-full h-full object-cover grayscale-[20%] contrast-125 mix-blend-luminosity opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface/80 to-transparent" />
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
        <ProgressHeader currentStep={1} totalSteps={4} />

        <header className="lg:hidden relative w-full h-[260px] flex items-end p-6 bg-surface-container-lowest overflow-hidden">
          <img
            alt=""
            src={HERO_MOBILE}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          <div className="relative z-10 w-full">
            <span className="text-primary font-headline text-xs font-bold tracking-[0.2em] uppercase block mb-3">
              CoachMatch · Personal Pro
            </span>
            <h1 className="font-headline text-4xl font-bold leading-tight text-on-surface">
              Ative sua
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dim">
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
              Complete seu perfil profissional para ser descoberto pelos alunos.
            </p>
          </div>

          <Section title="Identidade">
            <div className="bg-surface-container-low p-6 rounded-xl shadow-lg relative overflow-hidden space-y-5">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Nome Completo"
                  type="text"
                  value={authUser.name ?? 'Nome não informado'}
                  disabled
                />
                <Input
                  label="E-mail Profissional"
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
                <UploadCard
                  icon="videocam"
                  title="Vídeo de Apresentação"
                  description="Faça upload de um vídeo curto (até 60s) mostrando sua energia."
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
                Selecione suas principais áreas de atuação (máx 3).
              </p>
              <div className="bg-surface-container-highest rounded-full px-4 py-3 flex items-center border border-outline-variant/15 focus-within:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant mr-3">
                  search
                </span>
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
                {specialtyOptions.map((label) => {
                  const active = form.specialties.includes(label)
                  return (
                    <Chip
                      key={label}
                      label={label}
                      active={active}
                      onClick={() => {
                        toggleSpecialty(label)
                      }}
                      {...(active
                        ? {
                            onRemove: () => {
                              toggleSpecialty(label)
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
            <div className="space-y-4">
              <RadioOption
                label="Academias Parceiras"
                description="Atendo em academias específicas na minha região."
                checked={form.territory === 'GYMS'}
                onChange={() => {
                  update('territory', 'GYMS')
                }}
              />
              {form.territory === 'GYMS' ? (
                <div className="ml-10 pl-5 border-l-2 border-surface-container-highest space-y-4">
                  <div className="bg-surface-container-highest rounded-t-lg border-b border-surface-variant focus-within:border-primary transition-colors p-3 flex items-center">
                    <span className="material-symbols-outlined text-on-surface-variant mr-3">
                      location_on
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar por nome da academia ou bairro..."
                      value={gymSearch}
                      onChange={(e) => {
                        setGymSearch(e.target.value)
                        clearGym()
                      }}
                      className="bg-transparent border-none w-full text-on-surface font-body text-sm focus:ring-0 focus:outline-none p-0 placeholder-on-surface-variant/50"
                    />
                  </div>
                  {gymOptions.length > 0 && !form.gym ? (
                    <div className="space-y-2">
                      {gymOptions.slice(0, 5).map((gym) => (
                        <button
                          key={gym.id}
                          type="button"
                          onClick={() => {
                            selectGym(gym)
                          }}
                          className="w-full rounded-lg bg-surface-container-low px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
                        >
                          <span className="block font-body text-sm text-on-surface">
                            {gym.name}
                          </span>
                          <span className="block font-body text-xs text-on-surface-variant">
                            {gym.neighborhood}, {gym.city} - {gym.state}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {form.gym ? (
                    <div className="inline-flex items-center bg-surface-container-low border border-outline-variant/30 rounded-lg py-2 px-3 gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-body text-xs text-on-surface">{form.gymName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearGym()
                        }}
                        className="text-on-surface-variant hover:text-error transition-colors ml-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setGymError('Busque uma academia existente antes de concluir.')
                      }}
                      className="text-primary text-xs font-bold uppercase tracking-widest hover:underline"
                    >
                      + Sugerir academia
                    </button>
                  )}
                  {errors.gym ? <p className="font-body text-xs text-error">{errors.gym}</p> : null}
                </div>
              ) : null}

              <RadioOption
                label="Home Service / Outdoor"
                description="Vou até o cliente ou atendo em parques/condomínios."
                checked={form.territory === 'HOME_SERVICE'}
                onChange={() => {
                  update('territory', 'HOME_SERVICE')
                }}
              />
              {form.territory === 'HOME_SERVICE' ? (
                <div className="ml-10 pl-5 border-l-2 border-surface-container-highest mt-2">
                  <div className="flex justify-between font-label text-xs text-on-surface-variant mb-2">
                    <span>Raio de Atendimento</span>
                    <span className="text-primary font-bold">{form.radius} km</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    value={form.radius}
                    onChange={(e) => {
                      update('radius', Number(e.target.value))
                    }}
                    className="w-full accent-primary"
                  />
                  {errors.radius ? (
                    <p className="mt-2 font-body text-xs text-error">{errors.radius}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Section>

          <div className="pt-4 pb-12">
            <button
              type="button"
              disabled={updateCoach.isPending}
              onClick={submit}
              className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-headline font-bold text-lg py-4 rounded-lg shadow-[0_10px_30px_rgba(244,255,198,0.15)] hover:shadow-[0_10px_40px_rgba(244,255,198,0.25)] hover:brightness-105 transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-60 disabled:pointer-events-none"
            >
              {updateCoach.isPending ? 'Salvando...' : 'Concluir Perfil'}
              {!updateCoach.isPending ? (
                <span className="material-symbols-outlined">arrow_forward</span>
              ) : null}
            </button>
            {updateCoach.isError ? (
              <p className="mt-4 text-center font-body text-xs text-error">
                Não foi possível salvar seu perfil. Revise os dados e tente novamente.
              </p>
            ) : null}
            <p className="text-center font-body text-xs text-on-surface-variant mt-4">
              Ao continuar, você aceita nossos{' '}
              <a
                className="text-primary underline decoration-primary/30 underline-offset-2"
                href="#"
              >
                Termos de Curadoria
              </a>
              .
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
      className="bg-surface-container-low rounded-xl p-5 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center hover:bg-surface-container-highest transition-colors cursor-pointer group min-h-[160px]"
    >
      <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
      </div>
      <h3 className="font-headline text-sm font-semibold text-on-surface mb-1">{title}</h3>
      <p className="font-body text-xs text-on-surface-variant max-w-[200px]">{description}</p>
    </button>
  )
}
