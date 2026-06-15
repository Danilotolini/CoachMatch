import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  /** Há mais páginas para carregar. */
  hasMore: boolean
  /** Já existe uma página sendo carregada (evita disparos duplicados). */
  isLoading: boolean
  /** Dispara o carregamento da próxima página. */
  onLoadMore: () => void
  /** Antecipa o carregamento antes de chegar exatamente no fim. */
  rootMargin?: string
}

/**
 * Auto-carrega a próxima página quando a sentinela entra na viewport do
 * container rolável. Aplique `rootRef` no container com scroll e `sentinelRef`
 * num elemento no fim da lista.
 */
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = '80px',
}: UseInfiniteScrollOptions) {
  const rootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  })

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current()
      },
      { root: rootRef.current, rootMargin },
    )
    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, isLoading, rootMargin])

  return { rootRef, sentinelRef }
}
