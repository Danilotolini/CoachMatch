describe('Onboarding do aluno', () => {
  beforeEach(() => {
    // O CEP é resolvido no ViaCEP, um serviço externo. A resposta vem de fixture
    // para o teste não depender da internet nem da disponibilidade de terceiros.
    cy.intercept('GET', 'https://viacep.com.br/ws/01310100/json/', {
      fixture: 'viacep-avenida-paulista.json',
    }).as('viaCep')

    cy.visit('/client/login')
    cy.location('pathname').should('eq', '/client/onboarding')
  })

  it('aponta os campos obrigatórios quando o aluno tenta continuar sem preencher', () => {
    cy.contains('button:visible', 'CONTINUAR').click()

    cy.contains('Telefone incompleto.').should('be.visible')
    cy.contains('Informe sua data de nascimento.').should('be.visible')
    cy.contains('Selecione uma opção.').should('be.visible')
    cy.contains('Informe um CEP válido.').should('be.visible')
    cy.contains('Escolha um objetivo principal.').should('be.visible')
    cy.location('pathname').should('eq', '/client/onboarding')
  })

  it('completa o perfil e o questionário de saúde e chega à home', () => {
    cy.get('#celular').type('11999999999').should('have.value', '(11) 99999-9999')
    cy.get('#data-de-nascimento').type('1995-05-20')
    cy.contains('button', 'Prefiro não dizer').click()
    cy.get('#cep').type('01310100')
    cy.wait('@viaCep')
    cy.get('#cidade').should('have.value', 'São Paulo')
    cy.get('#estado').should('have.value', 'SP')
    cy.contains('button', 'Condicionamento').click()
    cy.contains('button:visible', 'CONTINUAR').click()

    cy.location('pathname').should('eq', '/client/health')
    cy.get('button:contains("Não")').click({ multiple: true })
    cy.contains('label', 'Autorizo o CoachMatch').click()
    cy.contains('label', 'Entendo que o CoachMatch não é serviço médico').click()
    cy.contains('button', 'CONCLUIR').click()

    cy.location('pathname').should('eq', '/client')
    cy.contains('h1', 'Oi, Aluno').should('be.visible')
  })
})
