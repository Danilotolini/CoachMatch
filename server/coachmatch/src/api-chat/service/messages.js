import { getStreamClient } from "../../shared/streamClient.js";
import { assertMembership, assertMessageAuthor } from "../lib/membership.js";

const CHANNEL_TYPE = "messaging";

const serializeMessage = (message) => ({
  id: message.id,
  text: message.text,
  userId: message.user?.id,
  createdAt: message.created_at,
  updatedAt: message.updated_at,
  deletedAt: message.deleted_at ?? null,
});

/** Envia uma mensagem na conversa. Exige ser membro. */
export const sendMessage = async ({ userId, channelId, text }) => {
  const stream = getStreamClient();
  const channel = await assertMembership(stream, channelId, userId);
  const res = await channel.sendMessage({ text, user_id: userId });
  return serializeMessage(res.message);
};

/** Lista mensagens da conversa (paginação por `before` = id_lt). Exige ser membro. */
export const listMessages = async ({ userId, channelId, limit = 30, before }) => {
  const stream = getStreamClient();
  const channel = await assertMembership(stream, channelId, userId);
  const messagesFilter = { limit };
  if (before) messagesFilter.id_lt = before;
  const res = await channel.query({ messages: messagesFilter, watch: false });
  return (res.messages ?? []).map(serializeMessage);
};

/** Edita uma mensagem. Exige ser o autor. */
export const updateMessage = async ({ userId, messageId, text }) => {
  const stream = getStreamClient();
  await assertMessageAuthor(stream, messageId, userId);
  const res = await stream.updateMessage({ id: messageId, text }, userId);
  return serializeMessage(res.message);
};

/** Apaga (soft delete) uma mensagem. Exige ser o autor. */
export const deleteMessage = async ({ userId, messageId }) => {
  const stream = getStreamClient();
  await assertMessageAuthor(stream, messageId, userId);
  const res = await stream.deleteMessage(messageId);
  return serializeMessage(res.message);
};
