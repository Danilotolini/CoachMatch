describe('Rotas protegidas', () => {
  it('o aluno sem perfil que tenta abrir a home é levado ao onboarding', () => {
    cy.visit('/client')

    cy.location('pathname').should('eq', '/client/onboarding')
    cy.contains('h1', 'Conte um pouco').should('be.visible')
  })

  it('o treinador sem perfil que tenta abrir o painel é levado ao onboarding', () => {
    cy.visit('/coach')

    cy.location('pathname').should('eq', '/coach/onboarding')
  })

  it('o aluno com perfil completo não volta para o onboarding', () => {
    cy.loginAs('client')

    cy.visit('/client/onboarding')

    cy.location('pathname').should('eq', '/client')
  })

  it('o treinador aprovado não volta para o onboarding', () => {
    cy.loginAs('coach')

    cy.visit('/coach/onboarding')

    cy.location('pathname').should('eq', '/coach')
  })
})
