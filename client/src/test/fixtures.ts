import { initialCoach } from '@/mocks/fixtures'
import type { CardPaymentPayload, Client, Coach, Transaction } from '@/types/api'

export function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    clientId: 'client_demo',
    email: 'aluno@coachmatch.app',
    status: 'ACTIVE',
    name: 'Aluno Demo',
    phone: '+5511999999999',
    birthDate: '1995-05-20',
    gender: 'NA',
    cep: '01310-100',
    city: 'São Paulo',
    state: 'SP',
    radius: 10,
    goal: 'CONDITIONING',
    health: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeCoach(overrides: Partial<Coach> = {}): Coach {
  return {
    ...initialCoach,
    profile: { ...initialCoach.profile },
    work_location: [...initialCoach.work_location],
    ...overrides,
  }
}

export function makeCardPayment(overrides: Partial<CardPaymentPayload> = {}): CardPaymentPayload {
  return {
    sessionId: 'session_demo',
    coachId: 'coach_demo',
    studentId: 'student_demo',
    amount: 18000,
    method: 'credit_card',
    card: {
      number: '4111111111111111',
      holder: 'JOHN DOE',
      expiryMonth: '12',
      expiryYear: '2030',
      cvv: '123',
    },
    ...overrides,
  }
}

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    transactionId: 'txn_demo',
    sessionId: 'session_demo',
    coachId: 'coach_demo',
    studentId: 'student_demo',
    method: 'credit_card',
    amount: 18000,
    status: 'approved',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
