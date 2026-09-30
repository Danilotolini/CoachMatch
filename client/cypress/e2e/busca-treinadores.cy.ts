// O campo de busca é controlado pela URL, que o roteador atualiza de forma
// assíncrona. Na velocidade padrão do Cypress (10 ms por tecla) a tecla seguinte
// chega antes de a anterior ser aplicada e o texto se perde.
const RITMO_DE_DIGITACAO = { delay: 100 }

describe('Busca de treinadores', () => {
  beforeEach(() => {
    cy.loginAs('client')
    cy.visit('/client/search')
  })

  it('lista a primeira página e carrega o restante em "ver mais"', () => {
    cy.contains('9 treinadores encontrados').should('be.visible')

    cy.contains('button', 'VER MAIS').click()

    cy.contains('12 treinadores encontrados').should('be.visible')
    cy.contains('Fim dos resultados').should('be.visible')
  })

  it('filtra pelo nome digitado', () => {
    cy.get('input[aria-label="Nome ou bairro"]').type('Marcos', RITMO_DE_DIGITACAO)

    cy.contains('1 treinadores encontrados').should('be.visible')
    cy.contains('button', 'Marcos Vieira').should('be.visible')
    cy.location('search').should('eq', '?q=Marcos')
  })

  it('filtra por modalidade', () => {
    cy.get('button[aria-label="Abrir filtros avançados"]').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'Yoga').click()
      cy.contains('button', 'APLICAR').click()
    })

    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('button', 'Larissa Nunes').should('be.visible')
    cy.contains('button', 'Marcos Vieira').should('not.exist')
  })

  it('mostra estado vazio e permite limpar a busca', () => {
    cy.get('input[aria-label="Nome ou bairro"]').type('inexistente', RITMO_DE_DIGITACAO)
    cy.contains('Nenhum treinador encontrado pra esses filtros').should('be.visible')

    cy.contains('button', 'LIMPAR FILTROS').click()

    cy.contains('9 treinadores encontrados').should('be.visible')
  })

  it('abre o perfil do treinador escolhido', () => {
    cy.get('input[aria-label="Nome ou bairro"]').type('Marcos', RITMO_DE_DIGITACAO)
    cy.contains('button', 'Marcos Vieira').click()

    cy.location('pathname').should('eq', '/client/coaches/coach_marcos')
    cy.contains('h1', 'Marcos Vieira').should('be.visible')
    cy.contains('Studio Marcos · Pinheiros · São Paulo').should('be.visible')
  })
})
