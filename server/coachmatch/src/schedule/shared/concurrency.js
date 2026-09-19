import { ScheduleConflictException, ScheduleNotFoundException } from './exceptions.js';

/**
 * Guarda de concorrência para as escritas em `requests[]`.
 *
 * As três lambdas que mexem na lista (criar, cancelar e aprovar solicitação)
 * fazem read-modify-write: leem o array inteiro, recalculam em memória e
 * regravam. Sem condição, duas solicitações simultâneas no mesmo horário se
 * sobrescrevem — a segunda escrita apaga a entrada da primeira, que já recebeu
 * 200 e já disparou e-mail ao coach.
 *
 * A condição amarra a escrita ao valor lido: se alguém alterou `requests` entre
 * a leitura e a escrita, a escrita falha (409) em vez de apagar dados.
 *
 * O `OR` cobre as duas formas do "sem solicitação ainda": atributo ausente
 * (`putSchedule` omite os nulos) e atributo gravado como NULL pelas lambdas
 * Python antigas.
 *
 * @param {Array|null|undefined} existingRequests - `requests` como foi lido.
 * @returns {{ condition: string, values: object }} fragmento para a
 *   `ConditionExpression` (usa o alias `#req`) e seus valores.
 */
export const requestsUnchanged = (existingRequests) => ({
  condition: 'attribute_not_exists(#req) OR #req = :expectedRequests',
  values: { ':expectedRequests': existingRequests ?? null },
});

/**
 * Traduz um `ConditionalCheckFailedException` das escritas guardadas acima.
 *
 * A condição junta duas coisas — o schedule existir e `requests` não ter
 * mudado — e o DynamoDB devolve o mesmo erro para as duas. `ALL_OLD` resolve a
 * ambiguidade: com o item antigo em mãos, a falha só pode ter sido da guarda de
 * concorrência; sem ele, o schedule não existe mais.
 *
 * @param {string} scheduleId
 * @param {Error & { Item?: object }} err - erro do SDK, com o item antigo
 *   anexado por `ReturnValuesOnConditionCheckFailure: 'ALL_OLD'`.
 */
export const conditionFailureToException = (scheduleId, err) =>
  err.Item
    ? new ScheduleConflictException(
      'O agendamento foi modificado simultaneamente. Tente novamente.',
    )
    : new ScheduleNotFoundException(`Agendamento '${scheduleId}' não encontrado.`);
