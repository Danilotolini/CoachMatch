export function formatMoney(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function paymentLabel(status: string | null): string | null {
  if (!status) return null
  if (status === 'PAID') return 'Pago'
  if (status === 'PENDING') return 'Pendente'
  return status.toLowerCase()
}
