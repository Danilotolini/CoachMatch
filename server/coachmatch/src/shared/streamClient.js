import { StreamChat } from "stream-chat";

let cachedClient;

/**
 * Retorna uma instância singleton do StreamChat server SDK.
 * As credenciais ficam APENAS no backend (apiSecret nunca vai pro client).
 */
export const getStreamClient = () => {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "STREAM_API_KEY e STREAM_API_SECRET precisam estar definidos no ambiente."
    );
  }

  cachedClient = StreamChat.getInstance(apiKey, apiSecret);
  return cachedClient;
};

/** Reseta o cache do client — usado apenas nos testes. */
export const __resetStreamClientForTests = () => {
  cachedClient = undefined;
};
