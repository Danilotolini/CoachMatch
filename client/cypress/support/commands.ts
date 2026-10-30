type Role = 'client' | 'coach'

const MOCK_PROFILE_STORAGE_KEY: Record<Role, string> = {
  client: 'coachmatch:mock:client',
  coach: 'coachmatch:mock:coach',
}

const HOME_PATH: Record<Role, string> = {
  client: '/client',
  coach: '/coach',
}

// O perfil padrão dos mocks nasce em PENDING_PROFILE e o app prende o usuário no
// onboarding. Gravar o perfil completo antes de a página carregar é o que libera
// as rotas internas sem repetir o cadastro em todo teste.
Cypress.Commands.add('loginAs', (role: Role) => {
  cy.fixture(`${role}-perfil-completo`).then((profile: unknown) => {
    cy.visit(`/${role}/login`, {
      onBeforeLoad: (win) => {
        win.localStorage.setItem(MOCK_PROFILE_STORAGE_KEY[role], JSON.stringify(profile))
      },
    })
  })
  cy.location('pathname').should('eq', HOME_PATH[role])
})

// Fetch original de cada página, guardado antes de os mocks do app o substituírem.
let nativeFetch: typeof fetch | undefined

// Sem service worker disponível, os mocks do app passam a interceptar as chamadas
// dentro da própria página. Com o service worker, as páginas de testes anteriores
// continuam registradas nele e podem receber requisições da página atual, que
// então responde com o estado errado ou fica esperando para sempre.
Cypress.on('window:before:load', (win) => {
  Reflect.deleteProperty(Object.getPrototypeOf(win.navigator) as object, 'serviceWorker')
  nativeFetch = win.fetch
})

// Os mocks do app respondem às chamadas de API antes de elas chegarem à rede,
// então `cy.intercept` nunca as vê. Devolver o fetch original à página faz as
// chamadas saírem para a rede, onde o teste controla as respostas. O efeito dura
// até o próximo carregamento de página, quando o app reativa os mocks.
Cypress.Commands.add('disableApiMocks', () => {
  cy.window().then((win) => {
    if (!nativeFetch) {
      throw new Error(
        `Fetch original não capturado para ${win.location.pathname}: recebido undefined, ` +
          'esperado o fetch guardado no carregamento da página (chame cy.visit antes)',
      )
    }
    win.fetch = nativeFetch
  })
})
