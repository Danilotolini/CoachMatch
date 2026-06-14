import { createCoach } from './service/coaches.service.js';

export const handler = async (event) => {
  const attributes = event?.request?.userAttributes;
  if (!attributes) throw new Error('Evento com formato inválido');

  await createCoach(attributes);
  return event;
};
