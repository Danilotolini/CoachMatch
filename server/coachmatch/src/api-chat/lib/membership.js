import { ForbiddenError, NotFoundError } from "./errors.js";

const CHANNEL_TYPE = "messaging";

/**
 * Garante que `userId` é membro do canal. Como o server SDK opera como admin
 * (ignora as permissões do Stream), a checagem de autorização é nossa.
 * Retorna a instância do canal já carregada para reuso.
 */
export const assertMembership = async (stream, channelId, userId) => {
  const channel = stream.channel(CHANNEL_TYPE, channelId);
  try {
    await channel.query({ state: true, watch: false });
  } catch {
    throw new NotFoundError("Conversa não encontrada");
  }
  const members = Object.keys(channel.state?.members ?? {});
  if (!members.includes(userId)) {
    throw new ForbiddenError();
  }
  return channel;
};

/**
 * Garante que a mensagem existe e pertence ao usuário (autor).
 * Retorna a mensagem carregada.
 */
export const assertMessageAuthor = async (stream, messageId, userId) => {
  let message;
  try {
    const res = await stream.getMessage(messageId);
    message = res?.message;
  } catch {
    throw new NotFoundError("Mensagem não encontrada");
  }
  if (!message) throw new NotFoundError("Mensagem não encontrada");
  if (message.user?.id !== userId) {
    throw new ForbiddenError("Você só pode alterar suas próprias mensagens");
  }
  return message;
};
