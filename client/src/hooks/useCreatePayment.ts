import { useMutation } from '@tanstack/react-query'
import { createPayment } from '@/api/payments'
import type { PaymentPayload } from '@/types/api'

export function useCreatePayment() {
  return useMutation({
    mutationFn: (payload: PaymentPayload) => createPayment(payload),
  })
}
