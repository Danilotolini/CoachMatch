import { Icon } from '@/components/ui/Icon'

interface ProfileHeroProps {
  eyebrow: string
  name: string
  email: string
  initials: string
  meta: string[]
  statusLabel: string
}

interface ProfileInfoItem {
  label: string
  value: string
}

interface ProfileSectionProps {
  title: string
  description?: string
  children: React.ReactNode
}

interface ProfileInfoGridProps {
  items: ProfileInfoItem[]
}

interface ProfileActionRowProps {
  icon: string
  title: string
  description: string
  action: string
}

interface ProfileLogoutButtonProps {
  onClick: () => void
}

export function ProfileHero({
  eyebrow,
  name,
  email,
  initials,
  meta,
  statusLabel,
}: ProfileHeroProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/10 bg-surface-container-low">
      <div className="kinetic-grid flex flex-col gap-6 p-6 md:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary-fixed shadow-[0_10px_30px_rgba(244,255,198,0.14)]">
            <span className="font-headline text-2xl font-black uppercase">{initials}</span>
          </div>
          <div className="min-w-0">
            <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
              {eyebrow}
            </span>
            <h1 className="mt-2 truncate font-headline text-3xl font-black tracking-tight text-on-surface md:text-4xl">
              {name}
            </h1>
            <p className="mt-2 truncate font-body text-sm text-on-surface-variant">{email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {meta.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-surface-container-high px-3 py-1 font-label text-[11px] font-bold uppercase tracking-wide text-on-surface-variant"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-on-primary-fixed">
          <Icon name="verified" size={16} filled />
          <span className="font-label text-[11px] font-black uppercase tracking-wide">
            {statusLabel}
          </span>
        </div>
      </div>
    </section>
  )
}

export function ProfileSection({ title, description, children }: ProfileSectionProps) {
  return (
    <section className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">{title}</h2>
        {description ? (
          <p className="mt-1 font-body text-sm text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ProfileInfoGrid({ items }: ProfileInfoGridProps) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-surface-container p-4">
          <dt className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
            {item.label}
          </dt>
          <dd className="mt-2 font-body text-sm font-medium text-on-surface">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ProfileActionRow({ icon, title, description, action }: ProfileActionRowProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-lg bg-surface-container p-4 text-left transition-colors hover:bg-surface-container-high active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-headline text-sm font-bold text-on-surface">{title}</span>
        <span className="mt-1 block font-body text-xs text-on-surface-variant">{description}</span>
      </span>
      <span className="shrink-0 font-label text-[11px] font-black uppercase tracking-wide text-primary">
        {action}
      </span>
    </button>
  )
}

export function ProfileLogoutButton({ onClick }: ProfileLogoutButtonProps) {
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label="Sair da conta"
        title="Sair da conta"
        className="group flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:text-on-surface active:scale-95"
      >
        <Icon name="logout" size={21} />
        <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 whitespace-nowrap rounded-lg border border-outline-variant/10 bg-surface-container-high px-3 py-2 font-label text-xs font-semibold text-on-surface opacity-0 shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Sair da conta
        </span>
      </button>
    </div>
  )
}
