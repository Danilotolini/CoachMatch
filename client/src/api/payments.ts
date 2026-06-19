import { apiPost, apiGet } from '@/lib/http'
import type { PaymentPayload, Transaction } from '@/types/api'

export function createPayment(payload: PaymentPayload): Promise<Transaction> {
  return apiPost<Transaction>('/payments', payload, { role: 'client' })
}

export function getPayment(transactionId: string): Promise<Transaction> {
  return apiGet<Transaction>(`/payments/${transactionId}`, undefined, { role: 'client' })
}

export function refundPayment(
  transactionId: string,
  amount: number,
  reason?: string,
): Promise<Transaction> {
  return apiPost<Transaction>(`/payments/${transactionId}/refund`, { amount, reason })
}
