import { apiPost, apiGet } from '@/lib/http'
import type { PaymentPayload, Transaction } from '@/types/api'

export function createPayment(payload: PaymentPayload): Promise<Transaction> {
  return apiPost<Transaction>('/payments', payload)
}

export function getPayment(transactionId: string): Promise<Transaction> {
  return apiGet<Transaction>(`/payments/${transactionId}`)
}

export function refundPayment(transactionId: string): Promise<Transaction> {
  return apiPost<Transaction>(`/payments/${transactionId}/refund`)
}
