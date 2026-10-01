describe('Falhas de rede na busca', () => {
  it('mostra o erro da API e se recupera ao tentar de novo', () => {
    cy.loginAs('client')
    // Desligar os mocks antes de a home terminar de carregar manda as chamadas dela
    // para a rede, e a home nunca chega a mostrar o botão de busca.
    cy.contains('button:visible', 'Buscar').should('be.visible')
    cy.disableApiMocks()
    cy.intercept('GET', '**/student/coaches*', { statusCode: 500 }).as('buscaComErro')

    cy.contains('button:visible', 'Buscar').click()

    cy.wait('@buscaComErro')
    cy.contains('Não foi possível carregar a busca').should('be.visible')

    cy.intercept('GET', '**/student/coaches*', { fixture: 'busca-um-treinador.json' }).as(
      'buscaComSucesso',
    )
    cy.contains('button', 'TENTAR DE NOVO').click()

    cy.wait('@buscaComSucesso')
    cy.contains('1 treinadores encontrados').should('be.visible')
    cy.contains('button', 'Camila Rocha').should('be.visible')
  })
})
