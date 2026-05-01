import { Link } from 'react-router'

export default function DashboardPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-headline text-3xl font-bold">Dashboard</h1>
      <Link className="text-primary text-sm hover:underline" to="/">← Voltar</Link>
    </main>
  )
}
