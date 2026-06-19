import { RatingPill } from '@/components/coach/RatingPill'

interface CoachCardProps {
  name: string
  specialties: string
  image?: string
  rating?: string | number
  price?: string | number
  location?: string
  availability?: string
  onClick?: () => void
}

export function CoachCard({
  name,
  specialties,
  image,
  rating,
  price,
  location,
  availability,
  onClick,
}: CoachCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-left overflow-hidden rounded-xl bg-surface-container-low border border-outline-variant/20 transition-all hover:border-outline-variant/40 active:scale-95"
    >
      <div
        className="relative aspect-4/3 bg-surface-container"
        style={
          image
            ? {
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {!image && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(244,255,198,0.18),transparent_60%)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-surface-container-lowest to-transparent" />
        {rating !== undefined && (
          <div className="absolute top-3 right-3">
            <RatingPill value={rating} />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="truncate font-headline font-semibold text-lg text-on-surface">{name}</div>
        <div className="mt-1 min-h-3.5 line-clamp-1 font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          {specialties}
        </div>
        {location ? (
          <div className="mt-2 flex items-center gap-1.5 font-body text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
            <span className="truncate">{location}</span>
          </div>
        ) : null}
        {price !== undefined && (
          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-1">
              <span className="font-headline font-bold text-lg text-primary">R$ {price}</span>
              <span className="text-on-surface-variant text-[11px]">/ sessão</span>
            </div>
            {availability ? (
              <span className="min-w-0 truncate text-right font-label text-[11px] text-on-surface-variant">
                {availability}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </button>
  )
}
