import { WelcomeFooter } from '@/components/welcome/WelcomeFooter'
import { WelcomeHeroPanel } from '@/components/welcome/WelcomeHeroPanel'
import { WelcomeProfileCard } from '@/components/welcome/WelcomeProfileCard'

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full flex-col bg-surface text-on-surface md:flex-row">
      <WelcomeHeroPanel />

      <section className="flex flex-1 flex-col justify-center bg-surface-dim px-6 py-12 md:px-24">
        <div className="mb-12 md:hidden">
          <span className="font-headline text-2xl font-black tracking-tighter text-primary uppercase">
            CoachMatch
          </span>
        </div>

        <header className="mb-12">
          <h1 className="font-headline mb-2 text-5xl font-bold tracking-tight">Bem-vindo.</h1>
          <p className="text-on-surface-variant text-lg">
            Como você deseja utilizar o CoachMatch hoje?
          </p>
        </header>

        <div className="grid w-full max-w-xl grid-cols-1 gap-6">
          <WelcomeProfileCard
            to="/client/login"
            icon="fitness_center"
            title="Acesso Aluno"
            description="Busco treinadores de elite e treinos personalizados."
          />
          <WelcomeProfileCard
            to="/coach/login"
            icon="lock"
            title="Acesso Treinador"
            description="Gerencie seus alunos e escale sua carreira."
          />
        </div>

        <WelcomeFooter />
      </section>
    </main>
  )
}
