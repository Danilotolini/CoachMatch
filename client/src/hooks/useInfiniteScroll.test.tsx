import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useInfiniteScroll } from './useInfiniteScroll'

type ObserverCallback = IntersectionObserverCallback

const observe = vi.fn()
const disconnect = vi.fn()
let callback: ObserverCallback | null = null
let observerOptions: IntersectionObserverInit | undefined

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null
  readonly rootMargin: string
  readonly thresholds: ReadonlyArray<number>

  constructor(cb: ObserverCallback, options?: IntersectionObserverInit) {
    callback = cb
    observerOptions = options
    this.root = options?.root ?? null
    this.rootMargin = options?.rootMargin ?? '0px'
    this.thresholds = [0]
  }

  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
  takeRecords = vi.fn(() => [])
}

function Harness({
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin,
}: {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  rootMargin?: string
}) {
  const { rootRef, sentinelRef } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore,
    ...(rootMargin ? { rootMargin } : {}),
  })

  return (
    <div ref={rootRef} data-testid="root">
      <div ref={sentinelRef} data-testid="sentinel" />
    </div>
  )
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    callback = null
    observerOptions = undefined
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('observa a sentinela com o root e margem configurados', () => {
    render(<Harness hasMore isLoading={false} onLoadMore={vi.fn()} rootMargin="120px" />)

    expect(observe).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    expect(observerOptions?.root).toBeInstanceOf(HTMLDivElement)
    expect(observerOptions?.rootMargin).toBe('120px')
  })

  it('chama onLoadMore quando a sentinela entra na viewport', () => {
    const onLoadMore = vi.fn()
    render(<Harness hasMore isLoading={false} onLoadMore={onLoadMore} />)

    act(() => {
      callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('não cria observer quando não há mais páginas ou já está carregando', () => {
    const { rerender } = render(<Harness hasMore={false} isLoading={false} onLoadMore={vi.fn()} />)

    expect(observe).not.toHaveBeenCalled()

    rerender(<Harness hasMore isLoading onLoadMore={vi.fn()} />)

    expect(observe).not.toHaveBeenCalled()
  })

  it('desconecta observer no unmount', () => {
    const { unmount } = render(<Harness hasMore isLoading={false} onLoadMore={vi.fn()} />)

    unmount()

    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
