import { updateCoachProfile } from '../service/coaches.service.js';

export const handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  await updateCoachProfile(coachId, body);

  return { statusCode: 200, body: JSON.stringify({ message: 'Perfil atualizado' }) };
};
