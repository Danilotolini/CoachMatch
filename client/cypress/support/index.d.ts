declare namespace Cypress {
  interface Chainable {
    /**
     * Entra no app com o perfil já completo (aluno ACTIVE ou treinador APPROVED)
     * e espera a home do papel carregar.
     */
    loginAs(role: 'client' | 'coach'): Chainable<void>
  }
}
