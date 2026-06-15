import { describe, expect, it } from 'vitest'
import { runPool } from './runPool'

describe('runPool', () => {
  it('respeita o limite de workers paralelos', async () => {
    let active = 0
    let maxActive = 0

    await runPool([1, 2, 3, 4, 5], 2, async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
    })

    expect(maxActive).toBeLessThanOrEqual(2)
  })
})
