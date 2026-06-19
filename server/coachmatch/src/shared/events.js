import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});
const QUEUE_URL = process.env.PAYMENT_SUCCEEDED_QUEUE_URL;

/**
 * Emite o evento `payment.succeeded` na fila SQS.
 *
 * O domínio de schedule consome este evento (interpretando `sessionId` como
 * `scheduleId`) e marca o agendamento como pago. Payment permanece genérico:
 * apenas ecoa o `sessionId` de volta, sem conhecer o domínio de agendamento.
 *
 * Em ambiente local/offline (sem fila configurada) vira no-op.
 *
 * @param {{ sessionId, transactionId, studentId, coachId, amount, status, createdAt }} transaction
 */
export const emitPaymentSucceeded = async (transaction) => {
  if (!QUEUE_URL) return;

  const body = {
    event: 'payment.succeeded',
    sessionId: transaction.sessionId,
    transactionId: transaction.transactionId,
    studentId: transaction.studentId,
    coachId: transaction.coachId,
    amount: transaction.amount,
    status: transaction.status,
    createdAt: transaction.createdAt,
  };

  await sqs.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(body),
  }));
};
