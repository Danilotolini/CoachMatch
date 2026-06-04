export const send = handle(async (event, user) => {
  const channelId = requireParam(event, "id da conversa");
  const { text } = validate(sendMessageSchema, parseBody(event));
  return service.sendMessage({ userId: user.id, channelId, text });
});