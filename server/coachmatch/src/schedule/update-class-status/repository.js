import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createClient } from '../../shared/config.js';
import { ScheduleInternalException, ScheduleNotFoundException } from '../shared/exceptions.js';
import { PAYMENT_STATUS } from '../shared/constants.js';

const TABLE = 'schedule';

/**
 * Grava o status da aula finalizada, preservando um pagamento já confirmado.
 *
 * O PENDING escrito aqui significa "repasse ao coach pendente", mas divide o
 * atributo `paymentStatus` com o PAID que `on-payment-succeeded` grava quando o
 * aluno paga. Gravar PENDING sem condição apagaria esse PAID — e nada o
 * restauraria, já que o consumidor da fila exige `status = BOOKED`, que deixa de
 * valer assim que a aula é finalizada.
 *
 * Por isso: só escrevemos PENDING enquanto o pagamento não estiver confirmado, e
 * a condição cobre o PAID que chegue entre a leitura e a escrita — nesse caso
 * regravamos apenas o status.
 *
 * @returns {Promise<string>} `paymentStatus` em vigor depois da atualização.
 */
export const persistClassStatus = async (scheduleId, { status, updatedAt, currentPaymentStatus }) => {
  const docClient = createClient();

  if (currentPaymentStatus !== PAYMENT_STATUS.PAID) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: TABLE,
        Key: { scheduleId },
        UpdateExpression: 'SET #st = :status, paymentStatus = :pending, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
          ':pending': PAYMENT_STATUS.PENDING,
          ':updatedAt': updatedAt,
          ':paid': PAYMENT_STATUS.PAID,
        },
        ConditionExpression:
          'attribute_exists(scheduleId) AND (attribute_not_exists(paymentStatus) OR paymentStatus <> :paid)',
      }));
      return PAYMENT_STATUS.PENDING;
    } catch (err) {
      if (err.name !== 'ConditionalCheckFailedException') {
        throw new ScheduleInternalException(`Error updating schedule: ${err.message}`);
      }
      // Ou o schedule sumiu, ou o pagamento foi confirmado entre a leitura e a
      // escrita. Segue para a atualização sem `paymentStatus`, que distingue os
      // dois casos e preserva o PAID.
    }
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { scheduleId },
      UpdateExpression: 'SET #st = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':status': status, ':updatedAt': updatedAt },
      ConditionExpression: 'attribute_exists(scheduleId)',
    }));
    return PAYMENT_STATUS.PAID;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);
    }
    throw new ScheduleInternalException(`Error updating schedule: ${err.message}`);
  }
};
