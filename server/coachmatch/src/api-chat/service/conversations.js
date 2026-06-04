import { getStreamClient } from "../../shared/streamClient.js";
import { ChatValidationError } from "../lib/errors.js";
import { assertMembership } from "../lib/membership.js";

const CHANNEL_TYPE = "messaging";

/** Gera um channelId determinístico e estável para o par (independe da ordem). */
const buildChannelId = (a, b) => {
  const [first, second] = [a, b].sort();
  const slug = (id) => id.replace(/-/g, "").slice(0, 8);
  return `dm_${slug(first)}_${slug(second)}`;
};

/** Serializa um canal do Stream para o formato exposto pela API. */
const serializeChannel = (channel) => {
  const data = channel.data ?? {};
  const lastMessage = channel.state?.messages?.at?.(-1) ?? null;
  return {
    id: channel.id,
    name: data.name ?? null,
    members: Object.keys(channel.state?.members ?? {}),
    frozen: Boolean(data.frozen),
    lastMessageAt: data.last_message_at ?? null,
    lastMessage: lastMessage
      ? { id: lastMessage.id, text: lastMessage.text, userId: lastMessage.user?.id }
      : null,
  };
};

/** Cria (ou recupera) a conversa direta entre o usuário e um par (aluno↔coach). */
export const createConversation = async ({ userId, peerId }) => {
  if (!peerId) throw new ChatValidationError("peerId é obrigatório");
  if (peerId === userId) {
    throw new ChatValidationError("Não é possível abrir conversa consigo mesmo");
  }

  const stream = getStreamClient();
  const channelId = buildChannelId(userId, peerId);
  const channel = stream.channel(CHANNEL_TYPE, channelId, {
    members: [userId, peerId],
    created_by_id: userId,
  });

  await channel.create();
  return serializeChannel(channel);
};

/** Lista as conversas em que o usuário é membro, mais recentes primeiro. */
export const listConversations = async ({ userId, limit = 30 }) => {
  const stream = getStreamClient();
  const channels = await stream.queryChannels(
    { type: CHANNEL_TYPE, members: { $in: [userId] } },
    { last_message_at: -1 },
    { limit, state: true, watch: false }
  );
  return channels.map(serializeChannel);
};

/** Atualiza metadados da conversa (nome, frozen). Exige ser membro. */
export const updateConversation = async ({ userId, channelId, data }) => {
  const stream = getStreamClient();
  const channel = await assertMembership(stream, channelId, userId);

  const set = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.frozen !== undefined) set.frozen = data.frozen;

  await channel.updatePartial({ set });
  await channel.query({ state: true, watch: false });
  return serializeChannel(channel);
};

/** Oculta a conversa para o usuário (não destrói o histórico do outro membro). */
export const deleteConversation = async ({ userId, channelId }) => {
  const stream = getStreamClient();
  const channel = await assertMembership(stream, channelId, userId);
  await channel.hide(userId);
  return { id: channelId, hidden: true };
};
