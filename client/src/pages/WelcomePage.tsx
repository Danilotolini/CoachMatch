import { Link } from 'react-router'

export default function WelcomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-headline text-3xl font-bold">Bem-vindo</h1>
      <nav className="flex flex-col items-center gap-3 text-sm text-on-surface-variant">
        <Link className="text-primary hover:underline" to="/entrar">→ Entrar</Link>
        <Link className="text-primary hover:underline" to="/cadastro/profissional">→ Cadastro Profissional</Link>
        <Link className="text-primary hover:underline" to="/em-analise">→ Em Análise</Link>
        <Link className="text-primary hover:underline" to="/reprovado">→ Reprovado</Link>
        <Link className="text-primary hover:underline" to="/dashboard">→ Dashboard</Link>
      </nav>
    </main>
  )
}
