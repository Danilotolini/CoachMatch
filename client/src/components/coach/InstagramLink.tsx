import { instagramUrl } from '@/lib/formatters'

interface InstagramLinkProps {
  handle: string
  className?: string
}

/** Handle do Instagram como link para o perfil público, abrindo em nova aba. */
export function InstagramLink({ handle, className }: InstagramLinkProps) {
  return (
    <a href={instagramUrl(handle)} target="_blank" rel="noopener noreferrer" className={className}>
      {handle}
    </a>
  )
}
