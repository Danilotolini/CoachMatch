describe('Smoke', () => {
  it('a tela de boas-vindas oferece acesso para aluno e para treinador', () => {
    cy.visit('/')

    cy.contains('h1', 'Bem-vindo.').should('be.visible')
    cy.contains('button', 'Acesso Aluno').should('be.visible')
    cy.contains('button', 'Acesso Treinador').should('be.visible')
  })

  it('o aluno com perfil completo entra e vê a home', () => {
    cy.loginAs('client')

    cy.contains('h1', 'Oi, Aluno').should('be.visible')
    cy.contains('Recomendados pra você').should('be.visible')
  })

  it('o treinador aprovado entra e vê o painel', () => {
    cy.loginAs('coach')

    cy.contains('Perfil ativo').should('be.visible')
    cy.contains('Treinador Demo').should('be.visible')
  })

  it('uma rota inexistente mostra a página 404 e leva de volta ao início', () => {
    cy.visit('/rota-que-nao-existe')
    cy.contains('h1', 'Página não encontrada.').should('be.visible')

    cy.contains('button', 'IR PARA O INÍCIO').click()

    cy.location('pathname').should('eq', '/')
  })
})
