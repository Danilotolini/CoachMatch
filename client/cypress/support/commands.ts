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
