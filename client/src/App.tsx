export default function App() {
  return (
    <main className="min-h-dvh bg-surface text-on-surface kinetic-grid px-6 py-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="font-label text-xs uppercase tracking-[0.2em] text-primary">CoachMatch</p>
        <h1 className="font-headline text-5xl font-bold tracking-tighter md:text-6xl">
          Seu personal, sem adivinhação.
        </h1>
        <p className="font-body leading-relaxed text-on-surface-variant">
          Encontre o personal trainer ideal com credenciais verificadas (CREF), avaliações
          confiáveis e agendamento em um só lugar.
        </p>
        <button
          type="button"
          className="rounded bg-primary px-6 py-4 font-headline font-bold text-on-primary-fixed transition-all hover:brightness-110 active:scale-95"
        >
          AGENDAR SESSÃO
        </button>
      </div>
    </main>
  )
}
