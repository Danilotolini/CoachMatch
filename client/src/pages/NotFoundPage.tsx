import { useNavigate } from 'react-router'
import { Eyebrow } from '@/components/brand/Eyebrow'
import { Button } from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className="kinetic-grid relative flex min-h-[max(884px,100dvh)] w-full overflow-hidden bg-surface text-on-surface">
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-surface-container-high/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-surface-container-lowest to-transparent" />

      <section className="relative mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-16 pt-safe sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-3xl text-left sm:text-center">
          <Eyebrow>Rota fora do treino</Eyebrow>
          <h1 className="mt-5 max-w-full font-headline text-[clamp(3.25rem,14vw,8rem)] leading-[0.95] font-black tracking-tight sm:mx-auto lg:text-[8rem]">
            Página não encontrada.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant sm:mx-auto sm:text-lg lg:text-xl lg:leading-8">
            O endereço que você tentou acessar saiu do mapa.
          </p>

          <div className="mt-9 flex sm:justify-center">
            <Button
              icon="arrow_forward"
              onClick={() => void navigate('/')}
              className="w-full sm:w-auto"
            >
              IR PARA O INÍCIO
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
