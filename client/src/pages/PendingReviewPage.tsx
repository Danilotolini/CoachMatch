import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { env } from '@/lib/env'
import { logout } from '@/lib/cognito'

async function approveCoach(): Promise<void> {
  const res = await fetch(`${env.apiBaseUrl}/dev/approve-coach`, { method: 'POST' })
  if (!res.ok) throw new Error(`approve failed (${String(res.status)})`)
}

export default function PendingReviewPage() {
  const queryClient = useQueryClient()
  const approve = useMutation({
    mutationFn: approveCoach,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coachMe'] })
    },
  })

  function handleLogout() {
    logout()
  }

  return (
    <main className="relative flex min-h-[max(884px,100dvh)] w-full flex-col bg-surface text-on-surface">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-headline text-xl font-black tracking-tighter text-primary uppercase">
          CoachMatch
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="font-label text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface"
        >
          Sair
        </button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 md:px-12">
        <div className="w-full max-w-xl">
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-8 md:p-12">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-3xl text-primary">hourglass_top</span>
            </div>

            <h1 className="font-headline mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Perfil em análise.
            </h1>
            <p className="mb-8 text-base text-on-surface-variant">
              Recebemos seu cadastro. Nossa equipe está revisando suas credenciais e em breve você
              terá acesso ao painel. O processo costuma levar até 48h úteis.
            </p>

            <ul className="mb-8 flex flex-col gap-4">
              <Step done label="Cadastro enviado" />
              <Step current label="Verificação de credenciais" />
              <Step label="Acesso liberado" />
            </ul>

            <p className="text-sm text-on-surface-variant">
              Avisaremos por e-mail assim que seu perfil for aprovado.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/40 p-6">
            <p className="mb-3 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
              Modo desenvolvedor
            </p>
            <p className="mb-4 text-sm text-on-surface-variant">
              Use o botão abaixo para simular a liberação do perfil.
            </p>
            <Button
              type="button"
              variant="primary"
              loading={approve.isPending}
              onClick={() => {
                approve.mutate()
              }}
              icon="check"
            >
              Aprovar perfil
            </Button>
            {approve.isError ? (
              <p className="mt-3 text-sm text-error">Falha ao aprovar. Tente novamente.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

interface StepProps {
  label: string
  done?: boolean
  current?: boolean
}

function Step({ label, done = false, current = false }: StepProps) {
  const icon = done ? 'check_circle' : current ? 'progress_activity' : 'radio_button_unchecked'
  const iconColor = done ? 'text-primary' : current ? 'text-primary animate-pulse' : 'text-outline'
  const textColor = done || current ? 'text-on-surface' : 'text-on-surface-variant'

  return (
    <li className="flex items-center gap-3">
      <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
      <span className={`font-label text-base ${textColor}`}>{label}</span>
    </li>
  )
}
