import { getStreamClient } from "../../shared/streamClient.js";
import { ChatValidationError } from "../lib/errors.js";
import { assertMembership } from "../lib/membership.js";
import { resolveMemberImages } from "../lib/profiles.js";

const CHANNEL_TYPE = "messaging";

/** Gera um channelId determinístico e estável para o par (independe da ordem). */
const buildChannelId = (a, b) => {
  const [first, second] = [a, b].sort();
  const slug = (id) => id.replace(/-/g, "").slice(0, 8);
  return `dm_${slug(first)}_${slug(second)}`;
};

const memberIds = (channel) => Object.keys(channel.state?.members ?? {});

/** Numa conversa 1:1, o "par" é o outro membro a partir da ótica de quem pede. */
const peerOf = (members, selfId) => members.find((id) => id !== selfId) ?? null;

/**
 * Serializa um canal do Stream para o formato exposto pela API. A `image` é a
 * foto do par (a conversa é 1:1), resolvida por requisição — varia conforme quem
 * olha, então não pode ser guardada no canal como o `name`.
 */
const serializeChannel = (channel, { selfId, imagesByUser } = {}) => {
  const data = channel.data ?? {};
  const lastMessage = channel.state?.messages?.at?.(-1) ?? null;
  const members = memberIds(channel);
  const peerId = selfId ? peerOf(members, selfId) : null;
  return {
    id: channel.id,
    name: data.name ?? null,
    members,
    frozen: Boolean(data.frozen),
    lastMessageAt: data.last_message_at ?? null,
    image: peerId ? (imagesByUser?.get(peerId) ?? null) : null,
    lastMessage: lastMessage
      ? { id: lastMessage.id, text: lastMessage.text, userId: lastMessage.user?.id }
      : null,
  };
};

/** Cria (ou recupera) a conversa direta entre o usuário e um par (aluno↔coach). */
export const createConversation = async ({ userId, userName, peerId, peerName }) => {
  if (!peerId) throw new ChatValidationError("peerId é obrigatório");
  if (peerId === userId) {
    throw new ChatValidationError("Não é possível abrir conversa consigo mesmo");
  }

  const stream = getStreamClient();
  const channelId = buildChannelId(userId, peerId);

  // O Stream recusa criar o canal se algum membro ainda não existir como user.
  // O par pode nunca ter pedido um token de chat, então garantimos os dois.
  await stream.upsertUsers([
    { id: userId, role: "user", ...(userName ? { name: userName } : {}) },
    { id: peerId, role: "user", ...(peerName ? { name: peerName } : {}) },
  ]);

  const channel = stream.channel(CHANNEL_TYPE, channelId, {
    members: [userId, peerId],
    created_by_id: userId,
  });

  await channel.create();
  const imagesByUser = await resolveMemberImages([peerId]);
  return serializeChannel(channel, { selfId: userId, imagesByUser });
};

/** Lista as conversas em que o usuário é membro, mais recentes primeiro. */
export const listConversations = async ({ userId, limit = 30 }) => {
  const stream = getStreamClient();
  const channels = await stream.queryChannels(
    { type: CHANNEL_TYPE, members: { $in: [userId] } },
    { last_message_at: -1 },
    { limit, state: true, watch: false }
  );
  const peerIds = channels.map((channel) => peerOf(memberIds(channel), userId));
  const imagesByUser = await resolveMemberImages(peerIds);
  return channels.map((channel) => serializeChannel(channel, { selfId: userId, imagesByUser }));
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
  const imagesByUser = await resolveMemberImages([peerOf(memberIds(channel), userId)]);
  return serializeChannel(channel, { selfId: userId, imagesByUser });
};

/** Oculta a conversa para o usuário (não destrói o histórico do outro membro). */
export const deleteConversation = async ({ userId, channelId }) => {
  const stream = getStreamClient();
  const channel = await assertMembership(stream, channelId, userId);
  await channel.hide(userId);
  return { id: channelId, hidden: true };
};
