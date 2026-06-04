import { getStreamClient } from "../../shared/streamClient.js";
import { ChatValidationError } from "../lib/errors.js";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * Faz upsert do usuário no Stream e emite um token de acesso com validade de 24h.
 * O client usa esse token (junto da apiKey) para se conectar ao chat.
 */
export const issueToken = async ({ userId, name, email }) => {
  if (!userId) throw new ChatValidationError("userId é obrigatório");

  const stream = getStreamClient();

  await stream.upsertUser({
    id: userId,
    name: name ?? email ?? userId,
    role: "user",
  });

  const expiresAtSeconds = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = stream.createToken(userId, expiresAtSeconds);

  return {
    apiKey: process.env.STREAM_API_KEY,
    userId,
    token,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
};
