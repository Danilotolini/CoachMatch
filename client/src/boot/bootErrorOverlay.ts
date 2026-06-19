// Rede de segurança de inicialização. O env.ts (e outros módulos) podem lançar
// durante a avaliação dos imports, antes do React montar — sem isto a tela fica
// cinza e silenciosa. Estes handlers se auto-registram ao importar o módulo,
// então ele precisa ser o PRIMEIRO import do main.tsx.

let booted = false
let shown = false

function paint(error: unknown): void {
  if (booted || shown) return
  shown = true
  const root = document.getElementById('root')
  if (!root) return

  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  root.innerHTML = ''
  const panel = document.createElement('div')
  panel.setAttribute('role', 'alert')
  panel.style.cssText =
    'max-width:640px;margin:10vh auto;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;color:#1f2937;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08)'

  const title = document.createElement('h1')
  title.textContent = 'Falha ao iniciar o app'
  title.style.cssText = 'margin:0 0 8px;font-size:18px;font-weight:600;color:#b91c1c'

  const msg = document.createElement('p')
  msg.textContent = message
  msg.style.cssText = 'margin:0 0 12px;font-size:14px;line-height:1.5;white-space:pre-wrap'

  panel.append(title, msg)

  if (import.meta.env.DEV && stack) {
    const pre = document.createElement('pre')
    pre.textContent = stack
    pre.style.cssText =
      'margin:0;padding:12px;font-size:12px;line-height:1.4;background:#f9fafb;border-radius:8px;overflow:auto;color:#6b7280'
    panel.append(pre)
  }

  root.append(panel)
}

if (typeof window !== 'undefined') {
  // Erros de carregamento de recurso (img/script) não têm `error`; ignoramos
  // para não sequestrar a tela por falhas não-fatais.
  window.addEventListener('error', (event) => {
    if (event.error) paint(event.error)
  })
  window.addEventListener('unhandledrejection', (event) => {
    paint(event.reason)
  })
}

// Chamado após o React montar com sucesso: a partir daqui o overlay não captura
// mais nada, deixando erros de runtime para o React/Vite tratarem.
export function markBooted(): void {
  booted = true
}
