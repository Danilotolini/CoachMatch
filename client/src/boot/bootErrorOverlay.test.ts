import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown) => void

async function loadOverlay() {
  const handlers: Record<string, Handler> = {}
  vi.spyOn(window, 'addEventListener').mockImplementation((type, cb) => {
    handlers[type as string] = cb as Handler
  })
  vi.resetModules()
  const mod = await import('./bootErrorOverlay')
  return { mod, handlers }
}

function alert(): HTMLElement | null {
  return document.querySelector('#root [role="alert"]')
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('bootErrorOverlay', () => {
  it('pinta o painel com a mensagem ao receber um erro real', async () => {
    const { handlers } = await loadOverlay()
    handlers['error']({ error: new Error('VITE_API_BASE_URL is not defined') })
    expect(alert()?.textContent).toContain('VITE_API_BASE_URL is not defined')
    expect(alert()?.textContent).toContain('Falha ao iniciar o app')
  })

  it('ignora erros de recurso (sem event.error)', async () => {
    const { handlers } = await loadOverlay()
    handlers['error']({ error: null, message: 'Failed to load resource' })
    expect(alert()).toBeNull()
  })

  it('pinta o painel a partir de uma promise rejeitada', async () => {
    const { handlers } = await loadOverlay()
    handlers['unhandledrejection']({ reason: new Error('worker.start falhou') })
    expect(alert()?.textContent).toContain('worker.start falhou')
  })

  it('pinta apenas o primeiro erro', async () => {
    const { handlers } = await loadOverlay()
    handlers['error']({ error: new Error('primeiro') })
    handlers['error']({ error: new Error('segundo') })
    expect(document.querySelectorAll('#root [role="alert"]')).toHaveLength(1)
    expect(alert()?.textContent).toContain('primeiro')
    expect(alert()?.textContent).not.toContain('segundo')
  })

  it('não pinta nada após markBooted', async () => {
    const { mod, handlers } = await loadOverlay()
    mod.markBooted()
    handlers['error']({ error: new Error('erro pós-boot') })
    expect(alert()).toBeNull()
  })
})
