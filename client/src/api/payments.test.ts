import { beforeEach, describe, expect, it } from 'vitest'
import { createPayment, getPayment, refundPayment } from './payments'
import { loginAs } from '@/test/session'
import type { CardPaymentPayload } from '@/types/api'

const CARD_PAYLOAD: CardPaymentPayload = {
  sessionId: 'sched-1',
  coachId: 'coach-1',
  studentId: 'student-1',
  amount: 150,
  method: 'credit_card',
  card: {
    number: '4111111111111111',
    holder: 'João Silva',
    expiryMonth: '12',
    expiryYear: '2030',
    cvv: '123',
  },
}

beforeEach(() => {
  loginAs('client')
})

describe('createPayment', () => {
  it('cria um pagamento e retorna a transação', async () => {
    const result = await createPayment(CARD_PAYLOAD)
    expect(result).toBeDefined()
    expect(result.transactionId).toBeTruthy()
    expect(result.status).toBe('approved')
  })
})

describe('getPayment', () => {
  it('retorna uma transação pelo ID', async () => {
    const created = await createPayment({ ...CARD_PAYLOAD, sessionId: 'sched-2' })
    const result = await getPayment(created.transactionId)
    expect(result.transactionId).toBe(created.transactionId)
  })
})

describe('refundPayment', () => {
  it('processa estorno de uma transação', async () => {
    const created = await createPayment({ ...CARD_PAYLOAD, sessionId: 'sched-3' })
    const result = await refundPayment(created.transactionId, 150, 'Cancelamento')
    expect(result).toBeDefined()
  })
})
