// Os horários dos mocks são fixos em junho de 2026. Congelar só o `Date` mantém a
// agenda povoada sem travar os timers que o app e os mocks usam.
const DATA_DA_DEMO = new Date('2026-06-12T09:00:00-03:00')

describe('Agendamento', () => {
  beforeEach(() => {
    cy.clock(DATA_DA_DEMO, ['Date'])
  })

  it('o aluno solicita um horário e acompanha o pedido na agenda', () => {
    cy.loginAs('client')
    cy.visit('/client/coaches/coach_marcos')

    cy.contains('button', 'qui., 18 de jun.').click()
    cy.contains('button:visible', 'AGENDAR').click()
    cy.contains('Solicitação enviada. O treinador vai confirmar o agendamento.').should(
      'be.visible',
    )

    cy.visit('/client/schedule')
    cy.contains('button', 'Pedidos').click()
    cy.contains('h2', 'Marcos Vieira').should('be.visible')
    cy.contains('Aguardando treinador').should('be.visible')
  })

  it('o treinador aprova uma solicitação pendente', () => {
    cy.loginAs('coach')
    cy.visit('/coach/schedule')
    cy.contains('1 aguardando resposta').should('be.visible')

    cy.contains('Ana Ferreira').parent().contains('button', 'Aprovar').click()

    cy.contains('Nenhuma solicitação pendente no período.').should('be.visible')
  })
})
