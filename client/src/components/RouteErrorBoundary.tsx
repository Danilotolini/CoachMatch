import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Eyebrow } from '@/components/brand/Eyebrow'
import { Button } from '@/components/ui/Button'

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${String(error.status)} ${error.statusText}`
  if (error instanceof Error) return error.message
  return 'Erro inesperado.'
}

export function RouteErrorBoundary() {
  const error = useRouteError()

  return (
    <main className="kinetic-grid relative flex min-h-[max(884px,100dvh)] w-full overflow-hidden bg-surface text-on-surface">
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-surface-container-high/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-surface-container-lowest to-transparent" />

      <section className="relative mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-16 pt-safe sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-3xl text-left sm:text-center">
          <Eyebrow>Algo deu errado</Eyebrow>
          <h1 className="mt-5 max-w-full font-headline text-[clamp(2.5rem,10vw,6rem)] leading-[0.95] font-black tracking-tight sm:mx-auto">
            Não foi possível carregar esta tela.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant sm:mx-auto sm:text-lg lg:text-xl lg:leading-8">
            Tente recarregar. Se o problema continuar, volte mais tarde.
          </p>
          <p className="mt-3 font-label text-sm text-on-surface-variant/70">{describe(error)}</p>

          <div className="mt-9 flex sm:justify-center">
            <Button
              icon="refresh"
              onClick={() => {
                window.location.reload()
              }}
              className="w-full sm:w-auto"
            >
              RECARREGAR
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
