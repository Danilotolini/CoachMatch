declare namespace Cypress {
  interface Chainable {
    /**
     * Entra no app com o perfil já completo (aluno ACTIVE ou treinador APPROVED)
     * e espera a home do papel carregar.
     */
    loginAs(role: 'client' | 'coach'): Chainable<void>

    /**
     * Desliga os mocks de API do app na página atual para que `cy.intercept`
     * passe a controlar as respostas. Chame depois de a página carregar.
     */
    disableApiMocks(): Chainable<void>
  }
}
