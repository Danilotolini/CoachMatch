export const SCHEDULE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  REQUESTED: 'REQUESTED',
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NOSHOW: 'NOSHOW',
};

export const REQUEST_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

/**
 * `paymentStatus` do schedule. PENDING é gravado por `update-class-status`
 * (repasse ao coach pendente); PAID é gravado por `on-payment-succeeded` quando
 * o aluno paga. Como os dois fluxos escrevem no MESMO atributo, PAID sempre
 * vence: ver `update-class-status/repository.js`.
 */
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
};

export const CLASS_STATUS_ALLOWED = [SCHEDULE_STATUS.COMPLETED, SCHEDULE_STATUS.NOSHOW];

export const CANCELLABLE_SCHEDULE_STATUSES = [
  SCHEDULE_STATUS.AVAILABLE,
  SCHEDULE_STATUS.REQUESTED,
  SCHEDULE_STATUS.BOOKED,
];

export const REQUESTABLE_SCHEDULE_STATUSES = [SCHEDULE_STATUS.AVAILABLE, SCHEDULE_STATUS.REQUESTED];

export const CANCELLATION_WINDOW_HOURS = 6;
