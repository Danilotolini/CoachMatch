import { slowCypressDown } from 'cypress-slow-down'
import './commands'

// Câmera lenta para apresentar os testes: `--expose commandDelay=800` espera
// 800 ms antes de cada comando. Sem o valor, os testes rodam na velocidade normal.
const commandDelay: unknown = Cypress.expose('commandDelay')

if (commandDelay !== undefined) {
  const delayMs = Number(commandDelay)
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error(
      `commandDelay inválido: recebido ${JSON.stringify(commandDelay)}, ` +
        'esperado número de milissegundos >= 0 (ex.: --expose commandDelay=800)',
    )
  }
  slowCypressDown(delayMs, false)
}
