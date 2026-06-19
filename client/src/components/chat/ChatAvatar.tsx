import { Icon } from '@/components/ui/Icon'

interface ChatAvatarProps {
  name?: string | null | undefined
  image?: string | null | undefined
  /** Classes de tamanho do avatar (ex.: "h-11 w-11"). */
  className?: string
  iconSize?: number
}

export function ChatAvatar({
  name,
  image,
  className = 'h-11 w-11',
  iconSize = 22,
}: ChatAvatarProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={name?.trim() ? name.trim() : 'Foto de perfil'}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary ${className}`}
    >
      <Icon name="person" size={iconSize} />
    </span>
  )
}
