import { handle, parseBody } from "./lib/http.js";
import { ChatValidationError } from "./lib/errors.js";
import { validate, sendMessageSchema, editMessageSchema } from "./validation/schemas.js";
import * as service from "./service/messages.js";

const requireParam = (event, label) => {
  const id = event?.pathParameters?.id;
  if (!id) throw new ChatValidationError(`${label} é obrigatório`);
  return id;
};

/** POST /chat/conversations/{id}/messages — envia mensagem. */
export const send = handle(async (event, user) => {
  const channelId = requireParam(event, "id da conversa");
  const { text } = validate(sendMessageSchema, parseBody(event));
  return service.sendMessage({ userId: user.id, channelId, text });
});

/** GET /chat/conversations/{id}/messages — lista mensagens (paginação por `before`). */
export const list = handle((event, user) => {
  const channelId = requireParam(event, "id da conversa");
  const q = event?.queryStringParameters ?? {};
  return service.listMessages({
    userId: user.id,
    channelId,
    limit: Number(q.limit) || undefined,
    before: q.before,
  });
});

/** PATCH /chat/messages/{id} — edita uma mensagem do próprio autor. */
export const update = handle(async (event, user) => {
  const messageId = requireParam(event, "id da mensagem");
  const { text } = validate(editMessageSchema, parseBody(event));
  return service.updateMessage({ userId: user.id, messageId, text });
});

/** DELETE /chat/messages/{id} — apaga uma mensagem do próprio autor. */
export const remove = handle((event, user) => {
  const messageId = requireParam(event, "id da mensagem");
  return service.deleteMessage({ userId: user.id, messageId });
});
