import { useNavigate } from 'react-router'

interface WelcomeProfileCardProps {
  title: string
  description: string
  icon: string
  to: string
  badge?: string
}

export function WelcomeProfileCard({
  title,
  description,
  icon,
  to,
  badge,
}: WelcomeProfileCardProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => {
        void navigate(to)
      }}
      className="group relative flex min-h-40 w-full appearance-none items-center justify-between gap-4 rounded-xl border-0 bg-surface-container-low p-[2rem] text-left text-on-surface transition-all duration-300 hover:translate-x-1 hover:bg-surface-container-high active:scale-[0.99]"
    >
      <div className="flex flex-col items-start gap-2 text-left">
        <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="font-headline text-2xl font-semibold">{title}</h2>
          {badge ? (
            <span className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-on-surface-variant">{description}</p>
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
        <span className="material-symbols-outlined">arrow_forward</span>
      </div>
    </button>
  )
}
