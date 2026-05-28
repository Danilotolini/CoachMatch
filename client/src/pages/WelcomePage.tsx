import { Link } from 'react-router'
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
            to="/cadastro/cliente"
            icon="fitness_center"
            title="Sou Cliente"
            description="Busco coaches de elite e treinos personalizados."
          />
          <WelcomeProfileCard
            to="/entrar"
            icon="lock"
            title="Acesso Profissional"
            badge="SSO"
            description="Gerencie seus clientes e escale sua carreira. Acesso via login seguro (AWS Cognito)."
          />
        </div>

        <div className="mt-12">
          <p className="text-on-surface-variant text-sm font-medium">
            Já possui uma conta?{' '}
            <Link
              to="/entrar"
              className="text-primary hover:underline underline-offset-4 ml-1 transition-all"
            >
              Log In
            </Link>
          </p>
        </div>

        <WelcomeFooter />
      </section>
    </main>
  )
}
