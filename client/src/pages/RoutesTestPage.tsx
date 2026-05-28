import { Link } from 'react-router'

interface RouteEntry {
  path: string
  label: string
  description: string
}

const ROUTES: RouteEntry[] = [
  { path: '/', label: 'Boas-vindas', description: 'Tela inicial pública' },
  { path: '/entrar', label: 'Entrar', description: 'Redireciona para Cognito Hosted UI' },
  {
    path: '/cadastro/profissional',
    label: 'Onboarding Profissional',
    description: 'Formulário de cadastro (requer PROFILE_INCOMPLETE)',
  },
  {
    path: '/em-analise',
    label: 'Em Análise',
    description: 'Status PENDING_REVIEW',
  },
  {
    path: '/reprovado',
    label: 'Reprovado',
    description: 'Status REJECTED',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Status APPROVED (placeholder)',
  },
]

export default function RoutesTestPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 bg-surface text-on-surface">
      <div className="w-full max-w-md">
        <header className="text-center mb-10">
          <span className="font-headline text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Dev · Test
          </span>
          <h1 className="font-headline text-3xl font-bold mt-3 mb-2">Mapa de Rotas</h1>
          <p className="font-body text-sm text-on-surface-variant">
            Acesso rápido às telas do app. Rotas protegidas redirecionam pelo RouteGuard.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {ROUTES.map((route) => (
            <li key={route.path}>
              <Link
                to={route.path}
                className="group flex items-center justify-between gap-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 hover:border-primary/40 hover:bg-surface-container-high transition-all active:scale-[0.99]"
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <span className="font-headline text-base font-semibold text-on-surface">
                    {route.label}
                  </span>
                  <span className="font-body text-xs text-on-surface-variant truncate">
                    {route.description}
                  </span>
                  <code className="font-mono text-[11px] text-primary/80 mt-1">{route.path}</code>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                  arrow_forward
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
