const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/**
 * Formata um ISO 8601 para (date, time) usados no corpo dos e-mails de notificação.
 *
 * Extrai os componentes de wall-clock direto da string, sem passar por `Date`, para
 * preservar o horário local escrito no ISO. Converter para `Date` e formatar traria
 * o fuso do runtime da Lambda (UTC), deslocando o horário mostrado no e-mail.
 *
 * @param {string} isoString
 * @returns {{ date: string, time: string }} date no formato dd/mm/yyyy, time no formato HH:mm
 */
export const formatScheduleDateTime = (isoString) => {
  const match = ISO_DATETIME.exec(isoString);
  if (!match) {
    throw new RangeError(`Data ISO inválida: recebido '${isoString}', esperado ISO 8601 (ex.: 2026-05-25T07:00:00-03:00)`);
  }
  const [, year, month, day, hour, minute] = match;
  return { date: `${day}/${month}/${year}`, time: `${hour}:${minute}` };
};
