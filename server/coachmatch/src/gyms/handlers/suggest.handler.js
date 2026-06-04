import { suggestGym } from '../service/gyms.service.js';

export const handler = async (event) => {
  if (!event?.body) throw new Error('Evento inválido: body ausente');

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  await suggestGym(body);

  return { statusCode: 201, body: JSON.stringify({ message: 'Academia sugerida com sucesso' }) };
};
