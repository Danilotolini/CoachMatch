export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.map((value) => ({ value }))

  async function runNext(): Promise<void> {
    if (queue.length === 0) return
    const item = queue.shift()
    if (!item) return
    await worker(item.value)
    return runNext()
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext))
}
