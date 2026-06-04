import { handle, parseBody } from "./lib/http.js";
import { ChatValidationError } from "./lib/errors.js";
import {
  validate,
  createConversationSchema,
  updateConversationSchema,
} from "./validation/schemas.js";
import * as service from "./service/conversations.js";

const requireChannelId = (event) => {
  const id = event?.pathParameters?.id;
  if (!id) throw new ChatValidationError("id da conversa é obrigatório");
  return id;
};

/** POST /chat/conversations — cria/recupera a conversa com um par. */
export const create = handle(async (event, user) => {
  const { peerId } = validate(createConversationSchema, parseBody(event));
  return service.createConversation({ userId: user.id, peerId });
});

/** GET /chat/conversations — lista as conversas do usuário. */
export const list = handle((event, user) => {
  const limit = Number(event?.queryStringParameters?.limit) || undefined;
  return service.listConversations({ userId: user.id, limit });
});

/** PATCH /chat/conversations/{id} — edita nome/estado da conversa. */
export const update = handle(async (event, user) => {
  const channelId = requireChannelId(event);
  const data = validate(updateConversationSchema, parseBody(event));
  return service.updateConversation({ userId: user.id, channelId, data });
});

/** DELETE /chat/conversations/{id} — oculta a conversa para o usuário. */
export const remove = handle((event, user) => {
  const channelId = requireChannelId(event);
  return service.deleteConversation({ userId: user.id, channelId });
});
