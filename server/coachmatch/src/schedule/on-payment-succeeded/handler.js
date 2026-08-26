import { withLogger } from '../../shared/logger.js';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';

const TABLE = 'schedule';

/**
 * Consome `payment.succeeded` da fila e marca o agendamento como pago.
 *
 * Interpreta `sessionId` como `scheduleId` e grava `paymentStatus = PAID`
 * apenas se o schedule estiver `BOOKED` e pertencer ao aluno que pagou — assim
 * um pagamento não confirma horário cancelado, indisponível ou de outro aluno.
 *
 * Usa partial batch response: só devolve ao SQS os itens com falha transitória.
 */
const _handler = async (event) => {
  const docClient = createClient();
  const batchItemFailures = [];

  for (const record of event.Records ?? []) {
    let msg;
    try {
      msg = JSON.parse(record.body);
    } catch {
      console.warn(`[WARN] Mensagem malformada, descartando: ${record.body}`);
      continue;
    }

    const { sessionId: scheduleId, studentId, transactionId } = msg;

    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { scheduleId },
        UpdateExpression: 'SET paymentStatus = :paid, paymentTransactionId = :txn, updatedAt = :now',
        ConditionExpression: 'attribute_exists(scheduleId) AND #st = :booked AND studentId = :student',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':paid': 'PAID',
          ':txn': transactionId,
          ':now': new Date().toISOString(),
          ':booked': 'BOOKED',
          ':student': studentId,
        },
      }));
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Schedule não está BOOKED / aluno não bate / não existe: não reprocessar.
        console.warn(`[WARN] Ignorando pagamento para schedule inválido: ${record.body}`);
        continue;
      }
      // Falha transitória (throttle etc.) → devolve pro SQS reprocessar.
      console.error('[ERROR]', err);
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
export const handler = withLogger(_handler);
