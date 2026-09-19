import { UnauthorizedException } from './exceptions.js';

/**
 * Extrai o `sub` do JWT já validado pelo authorizer do API Gateway
 * (`event.requestContext.authorizer.jwt.claims.sub`).
 *
 * Não há decode nem verificação de assinatura aqui: o authorizer já rejeitou a
 * requisição se o token fosse inválido, então a claim pode ser lida direto.
 *
 * @param {object} event
 * @returns {string} coachId ou studentId, conforme o pool do authorizer da rota.
 */
export const getActorIdFromJwt = (event) => {
  const sub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) throw new UnauthorizedException("Header 'Authorization' ausente ou inválido.");
  return sub;
};
