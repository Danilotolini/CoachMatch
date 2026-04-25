const HERO_IMAGE = '/assets/images/welcome-hero.png'

export function WelcomeHeroPanel() {
  return (
    <section className="relative hidden min-h-[max(884px,100dvh)] overflow-hidden md:flex md:w-1/2">
      <img
        alt="Atleta em movimento"
        src={HERO_IMAGE}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/0 to-surface" />
      <div className="relative z-10 flex min-h-[max(884px,100dvh)] flex-col justify-between p-12">
        <span className="font-headline text-2xl font-black tracking-tighter text-primary uppercase">
          CoachMatch
        </span>
        <div className="max-w-md">
          <h2 className="font-headline mb-4 text-6xl leading-tight text-primary">
            A Performance Editorial
          </h2>
          <p className="text-lg leading-relaxed font-light text-on-surface-variant">
            Conectando a energia bruta do esporte com a sofisticação da alta performance. Bem-vindo
            ao novo padrão.
          </p>
        </div>
      </div>
    </section>
  )
}
